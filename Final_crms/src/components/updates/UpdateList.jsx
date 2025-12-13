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

  if (loading) return <div className="loading" style={{ padding: "20px" }}>Loading timeline…</div>;
  if (!updates.length) return <div style={{ color: "var(--muted, #a9b1b8)", padding: "20px", textAlign: "center" }}>No updates yet.</div>;

  return (
    <div style={{ marginTop: "20px" }}>
      <h4 style={{ marginBottom: "16px" }}>Timeline</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {updates.map((u) => (
          <div key={u.id} className="card" style={{ padding: "16px", margin: 0 }}>
            <div style={{ fontSize: "14px", color: "var(--text, #e6e6e6)", lineHeight: "1.6", marginBottom: "12px" }}>
              {u.text}
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted, #a9b1b8)", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              {u.status && (
                <span>
                  <strong>Status:</strong>{" "}
                  <span className={`status-pill status-${u.status}`} style={{ marginLeft: "4px" }}>
                    {u.status}
                  </span>
                </span>
              )}
              <span>{u.authorName || u.author || "Unknown"}</span>
              <span>•</span>
              <span>{u.createdAt?.toDate ? u.createdAt.toDate().toLocaleString() : u.createdAt}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
