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
    <div style={{ padding: 20 }}>
      <h2>Complaints</h2>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
        <input
          placeholder="Search title or description..."
          value={textQuery}
          onChange={(e) => setTextQuery(e.target.value)}
          style={{ padding: 8, width: 320, borderRadius: 6 }}
        />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          value={officerFilter}
          onChange={(e) => setOfficerFilter(e.target.value)}
          style={{ padding: 8, borderRadius: 6 }}
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

        <button onClick={() => { setTextQuery(""); setStatusFilter("all"); setOfficerFilter("all"); }} style={{ padding: "8px 10px", borderRadius: 6 }}>
          Reset
        </button>
      </div>

      {/* diagnostics */}
      {diagnosticsUI}

      {/* error */}
      {error && <div style={{ color: "salmon", marginBottom: 12 }}>{error}</div>}

      {/* results */}
      {complaints.length === 0 && !loading && <div>No complaints found</div>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {complaints.map((c) => (
          <li
            key={c.id}
            style={{
              padding: 14,
              borderRadius: 10,
              background: "rgba(255,255,255,0.02)",
              marginBottom: 12,
              cursor: "pointer"
            }}
            onClick={() => nav(`/complaint/${c.id}`)}
          >
            <strong style={{ display: "block", fontSize: 16 }}>{c.title}</strong>
            <div style={{ color: "var(--muted,#aaa)" }}>{c.description && c.description.slice(0, 160)}</div>
            <div style={{ marginTop: 8, fontSize: 13 }}>
              <span>Status: <strong>{c.status}</strong></span>{" • "}
              <span>By: {c.createdByName || c.createdBy}</span>{" • "}
              <span>Assigned: {c.assignedOfficerName || c.assignedOfficer}</span>
            </div>
          </li>
        ))}
      </ul>

      {loading && <div>Loading…</div>}

      {!loading && hasMore && (
        <div style={{ marginTop: 12 }}>
          <button onClick={handleLoadMore} style={{ padding: "8px 12px", borderRadius: 6 }}>
            Load more
          </button>
        </div>
      )}

      {/* small diagnostics footer */}
      <div style={{ marginTop: 18, color: "var(--muted,#777)", fontSize: 13 }}>
        Showing {complaints.length} items. Page size {PAGE_SIZE}. Search is client-side for title/description.
      </div>
    </div>
  );
}
