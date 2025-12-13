// src/components/updates/UpdateList.jsx
import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../utils/firebase";

/**
 * props:
 *  - complaintId (string)
 */
export default function UpdateList({ complaintId }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!complaintId) return;

    const colRef = collection(db, "complaints", complaintId, "updates");
    const q = query(colRef, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUpdates(arr);
        setLoading(false);
      },
      (err) => {
        console.error("updates snapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [complaintId]);

  if (loading) return <div>Loading timeline…</div>;
  if (!updates.length) return <div>No updates yet.</div>;

  return (
    <div style={{ marginTop: 12 }}>
      <h4>Timeline</h4>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {updates.map((u) => (
          <li key={u.id} style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
            <div style={{ fontSize: 14, color: "#eee" }}>{u.text}</div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>
              {u.status ? <strong>Status:</strong> : null}{" "}
              {u.status ? <span style={{ color: "#fff" }}>{u.status}</span> : null}
              <span style={{ marginLeft: 8 }}>{u.authorName || u.author || "Unknown"}</span>
              <span style={{ marginLeft: 12 }}>{u.createdAt?.toDate ? u.createdAt.toDate().toLocaleString() : u.createdAt}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
