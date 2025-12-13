// src/pages/ComplaintList.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";

const PAGE_SIZE = 10;

// tiny uid -> user info cache
const userCache = {};
async function getUserInfo(uid) {
  if (!uid) return null;
  if (userCache[uid]) return userCache[uid];
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      userCache[uid] = snap.data();
      return snap.data();
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export default function ComplaintList() {
  const { user } = useAuth();
  const nav = useNavigate();

  // UI/filter state
  const [statusFilter, setStatusFilter] = useState("all"); // all, open, in-progress, resolved
  const [officerFilter, setOfficerFilter] = useState("all"); // all or specific uid or "me"
  const [textQuery, setTextQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef(null);

  // data + pagination state
  const [complaints, setComplaints] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [error, setError] = useState("");

  // officers list for filter dropdown (small, fetched once)
  const [officers, setOfficers] = useState([]);
  const [officersLoading, setOfficersLoading] = useState(false);

  // reset data when filters/search changes
  useEffect(() => {
    // debounce text query to avoid frequent fetches
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(textQuery.trim()), 350);
    return () => clearTimeout(debounceRef.current);
  }, [textQuery]);

  // rebuild list when filters change
  useEffect(() => {
    setComplaints([]);
    setLastDoc(null);
    setHasMore(true);
    setDiagnostics(null);
    setError("");
    // load first page
    if (user) loadPage(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter, officerFilter, debouncedQuery]);

  // fetch officers for dropdown
  useEffect(() => {
    (async () => {
      setOfficersLoading(true);
      try {
        const q = query(collection(db, "users"));
        // fetch all users and filter locally (small project assumptions).
        // You can change to a where("role","==","officer") + index if needed.
        const snap = await getDocs(q);
        const arr = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
        // filter to role officer or admin if you want to assign admin as officer too
        const onlyOff = arr.filter((u) => u.role === "officer");
        onlyOff.sort((a, b) => {
          const na = (a.name || a.email || a.uid || "").toLowerCase();
          const nb = (b.name || b.email || b.uid || "").toLowerCase();
          return na < nb ? -1 : na > nb ? 1 : 0;
        });
        setOfficers(onlyOff);
      } catch (e) {
        // ignore quietly
      } finally {
        setOfficersLoading(false);
      }
    })();
  }, []);

  // Build Firestore query based on filters (no text)
  function buildFirestoreQuery(isNext = false) {
    const col = collection(db, "complaints");
    let q;

    // Admin sees everything unless officerFilter is set to a specific officer
    if (user.role === "admin") {
      q = query(col, orderBy("createdAt", "desc"), limit(PAGE_SIZE));
    } else {
      // Non-admin default: assignedOfficer == me
      q = query(
        col,
        where("assignedOfficer", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
    }

    // If a specific officer chosen (admin likely), apply where
    if (officerFilter && officerFilter !== "all" && officerFilter !== "me") {
      // if role isn't admin and they request 'me', we already used user.uid
      q = query(
        collection(db, "complaints"),
        where("assignedOfficer", "==", officerFilter),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
    }

    // Apply status filter server-side when possible
    if (statusFilter && statusFilter !== "all") {
      // For non-admin we must compose where("assignedOfficer","==",...) && where("status","==",...) + orderBy
      // Firestore may require a composite index for combined where+orderBy. We'll show diagnostics when needed.
      if (officerFilter && officerFilter !== "all") {
        // already built q specifically for assignedOfficer -> add a second where
        q = query(
          collection(db, "complaints"),
          where("assignedOfficer", "==", officerFilter),
          where("status", "==", statusFilter),
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE)
        );
      } else if (user.role === "admin") {
        // admin and no officer filter -> simple where status
        q = query(col, where("status", "==", statusFilter), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
      } else {
        // non-admin and no explicit officerFilter -> assigned to me + status
        q = query(
          collection(db, "complaints"),
          where("assignedOfficer", "==", user.uid),
          where("status", "==", statusFilter),
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE)
        );
      }
    }

    // pagination startAfter
    if (isNext && lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    return q;
  }

  async function loadPage(isNext = false) {
    // If a text query is used, we still use server filters for status/officer then filter client-side.
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const q = buildFirestoreQuery(isNext);
      const snap = await getDocs(q);

      // diagnostics: if Firestore requested composite index, the SDK throws an error and we catch it
      if (snap.empty && !isNext) {
        // empty first page
        setHasMore(false);
      }

      // map docs
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const newLast = snap.docs[snap.docs.length - 1] || null;

      // enrich docs with names (fallback)
      for (let c of docs) {
        if (!c.createdByName && c.createdBy) {
          const u = await getUserInfo(c.createdBy);
          c.createdByName = (u && (u.name || u.email)) || c.createdBy;
        }
        if (!c.assignedOfficerName && c.assignedOfficer) {
          const u = await getUserInfo(c.assignedOfficer);
          c.assignedOfficerName = (u && (u.name || u.email)) || c.assignedOfficer;
        }
      }

      // If there's a debounced text query, filter locally (title/description)
      let filtered = docs;
      if (debouncedQuery) {
        const qLower = debouncedQuery.toLowerCase();
        filtered = docs.filter((it) => {
          const t = (it.title || "").toLowerCase();
          const dsc = (it.description || "").toLowerCase();
          return t.includes(qLower) || dsc.includes(qLower);
        });
      }

      // Append results
      setComplaints((prev) => (isNext ? [...prev, ...filtered] : [...filtered]));
      setLastDoc(newLast);
      if (snap.docs.length < PAGE_SIZE) setHasMore(false);
    } catch (e) {
      console.error("Pagination / query error:", e);
      // detect and show firestore composite index message if present
      const msg = e && e.message ? e.message : String(e);
      setError("Error: " + msg);
      // If message contains "create_composite" URL, extract it so user can click it
      if (msg.includes("create_composite") || msg.includes("index")) {
        // crude extract of URL inside message
        const match = msg.match(/https?:\/\/console\.firebase\.google\.com[^\s'"]+/);
        if (match) setDiagnostics({ msg, url: match[0] });
        else setDiagnostics({ msg, url: null });
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  // load next page when user clicks
  async function handleLoadMore() {
    if (!hasMore) return;
    await loadPage(true);
  }

  // Clear diagnostics link if user modifies filters
  useEffect(() => {
    setDiagnostics(null);
  }, [statusFilter, officerFilter]);

  // client-side combined count / debug
  const diagnosticsUI = useMemo(() => {
    if (!diagnostics) return null;
    return (
      <div style={{ marginTop: 8, color: "salmon", fontSize: 13 }}>
        Composite index required for this combination of filters.
        {diagnostics.url && (
          <div>
            <a href={diagnostics.url} target="_blank" rel="noreferrer">
              Create index in console (click).
            </a>
          </div>
        )}
      </div>
    );
  }, [diagnostics]);

  if (!user) return null;

  return (
    <div>
      <div className="page-header">
        <h2>Complaints</h2>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px", minWidth: "250px" }}>
            <label htmlFor="search">Search</label>
            <input
              id="search"
              type="text"
              placeholder="Search title or description..."
              value={textQuery}
              onChange={(e) => setTextQuery(e.target.value)}
            />
          </div>

          <div style={{ flex: "0 1 180px" }}>
            <label htmlFor="status">Status</label>
            <select id="status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div style={{ flex: "0 1 200px" }}>
            <label htmlFor="officer">Officer</label>
            <select
              id="officer"
              value={officerFilter}
              onChange={(e) => setOfficerFilter(e.target.value)}
            >
              <option value="all">All officers</option>
              <option value="me">Assigned to me</option>
              {officersLoading ? (
                <option disabled>Loading officers…</option>
              ) : (
                officers.map((o) => (
                  <option key={o.uid} value={o.uid}>
                    {o.name || o.email || o.uid}
                  </option>
                ))
              )}
            </select>
          </div>

          <button 
            onClick={() => { setTextQuery(""); setStatusFilter("all"); setOfficerFilter("all"); }}
            style={{ height: "fit-content", marginTop: "20px" }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* diagnostics */}
      {diagnosticsUI}

      {/* error */}
      {error && <div className="error" style={{ marginBottom: "16px" }}>{error}</div>}

      {/* results */}
      {complaints.length === 0 && !loading && (
        <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--muted, #a9b1b8)" }}>
          No complaints found
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {complaints.map((c) => (
          <div
            key={c.id}
            className="card"
            style={{ cursor: "pointer" }}
            onClick={() => nav(`/complaint/${c.id}`)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", flex: 1 }}>{c.title}</h3>
              <span className={`status-pill status-${c.status || "open"}`}>
                {c.status || "open"}
              </span>
            </div>
            <p style={{ color: "var(--muted, #a9b1b8)", marginBottom: "12px", lineHeight: "1.5" }}>
              {c.description && c.description.slice(0, 200)}
              {c.description && c.description.length > 200 && "..."}
            </p>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px", color: "var(--muted, #a9b1b8)" }}>
              <span><strong style={{ color: "var(--text, #e6e6e6)" }}>By:</strong> {c.createdByName || c.createdBy}</span>
              <span><strong style={{ color: "var(--text, #e6e6e6)" }}>Assigned:</strong> {c.assignedOfficerName || c.assignedOfficer}</span>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <div className="loading">Loading…</div>
        </div>
      )}

      {!loading && hasMore && (
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <button onClick={handleLoadMore} className="primary">
            Load More
          </button>
        </div>
      )}

      {/* small diagnostics footer */}
      {complaints.length > 0 && (
        <div style={{ marginTop: "24px", color: "var(--muted, #a9b1b8)", fontSize: "13px", textAlign: "center" }}>
          Showing {complaints.length} items. Page size {PAGE_SIZE}. Search is client-side for title/description.
        </div>
      )}
    </div>
  );
}
