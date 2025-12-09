// src/pages/ComplaintList.jsx
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";
import { getDoc, doc } from "firebase/firestore";

// Simple in-memory cache for user docs — persists across component mounts
const userCache = {};

async function fetchUserOnce(uid) {
  if (!uid) return null;
  if (userCache[uid]) return userCache[uid];
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      userCache[uid] = snap.data();
      return userCache[uid];
    }
  } catch (e) {
    // ignore errors, return null
  }
  userCache[uid] = null;
  return null;
}

export default function ComplaintList() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState({});

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setList([]);
      setDebug({});
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const colRef = collection(db, "complaints");
        let q;
        if (user.role === "admin") {
          q = query(colRef, orderBy("createdAt", "desc"));
        } else {
          q = query(colRef, where("assignedOfficer", "==", user.uid), orderBy("createdAt", "desc"));
        }

        const snap = await getDocs(q);
        const complaints = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // If documents already include denormalized names -> done
        // Otherwise fetch missing names using cached fetch (one read per missing uid)
        const missingUids = new Set();
        for (const c of complaints) {
          if (!c.createdByName && c.createdBy) missingUids.add(c.createdBy);
          if (!c.assignedOfficerName && c.assignedOfficer) missingUids.add(c.assignedOfficer);
        }

        if (missingUids.size > 0) {
          // fetch each missing uid once only (cache inside fetchUserOnce)
          const fetchPromises = Array.from(missingUids).map((uid) => fetchUserOnce(uid));
          const results = await Promise.all(fetchPromises);
          // attach resolved names
          for (const c of complaints) {
            if (!c.createdByName && c.createdBy) {
              const u = userCache[c.createdBy];
              c.createdByName = (u && (u.name || u.email)) || c.createdBy;
            }
            if (!c.assignedOfficerName && c.assignedOfficer) {
              const u = userCache[c.assignedOfficer];
              c.assignedOfficerName = (u && (u.name || u.email)) || c.assignedOfficer;
            }
          }
        }

        if (mounted) {
          setList(complaints);
          setDebug({ returned: complaints.length, cachedUsers: Object.keys(userCache).length });
        }
      } catch (err) {
        console.error("ComplaintList error:", err);
        setDebug({ error: err.message || String(err) });
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [user]);

  if (loading) return <div style={{ padding: 20 }}>Loading complaints…</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Complaints</h2>

      <div style={{ marginBottom: 12, color: "#ccc" }}>
        <strong>Diagnostics:</strong>
        <pre style={{ color: "#ddd" }}>{JSON.stringify(debug, null, 2)}</pre>
      </div>

      {list.length === 0 ? (
        <div>No complaints found</div>
      ) : (
        <ul>
          {list.map((c) => (
            <li key={c.id} style={{ marginBottom: 12 }}>
              <strong>{c.title}</strong>
              <div>Status: {c.status}</div>
              <div>By: {c.createdByName || c.createdBy}</div>
              <div>Assigned: {c.assignedOfficerName || c.assignedOfficer}</div>
              <div style={{ fontSize: 12, color: "#999" }}>id: {c.id}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
