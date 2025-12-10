// src/pages/ComplaintList.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  doc,
  getDoc
} from "firebase/firestore";

import { db } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

import ComplaintCard from "../components/ui/ComplaintCard";

const PAGE_SIZE = 10;

// in-memory user cache for fallback when old complaints lack names
const userCache = {};

async function getUserInfo(uid) {
  if (!uid) return null;
  if (userCache[uid]) return userCache[uid];

  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const d = snap.data();
      userCache[uid] = d;
      return d;
    }
  } catch {}

  return null;
}

export default function ComplaintList() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  // Build Firestore query
  function buildQuery(isNext = false) {
    const col = collection(db, "complaints");

    let q;

    if (user.role === "admin") {
      q = query(col, orderBy("createdAt", "desc"), limit(PAGE_SIZE));
    } else {
      q = query(
        col,
        where("assignedOfficer", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
    }

    if (isNext && lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    return q;
  }

  // Load the first page or next page
  async function loadPage(isNext = false) {
    if (!isNext) {
      setComplaints([]);
      setLastDoc(null);
      setHasMore(true);
    }

    setLoading(true);

    try {
      const q = buildQuery(isNext);
      const snap = await getDocs(q);

      if (snap.empty) {
        setHasMore(false);
        setLoading(false);
        return;
      }

      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const newLast = snap.docs[snap.docs.length - 1];

      // fallback: attach names for older docs
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

      setComplaints((prev) => (isNext ? [...prev, ...docs] : docs));
      setLastDoc(newLast);

      if (snap.docs.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Pagination error:", err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) loadPage(false);
  }, [user]);

  if (!user) return null;

  return (
    <div>
      <h2>Complaints</h2>

      {/* Empty state */}
      {complaints.length === 0 && !loading && (
        <div>No complaints found</div>
      )}

      {/* Card List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {complaints.map((c) => (
          <ComplaintCard
            key={c.id}
            complaint={c}
            onClick={() => nav(`/complaint/${c.id}`)}
          />
        ))}
      </div>

      {/* Loading */}
      {loading && <div style={{ marginTop: 16 }}>Loading…</div>}

      {/* Load More */}
      {hasMore && !loading && (
        <button
          onClick={() => loadPage(true)}
          style={{ marginTop: 20 }}
        >
          Load More
        </button>
      )}
    </div>
  );
}
