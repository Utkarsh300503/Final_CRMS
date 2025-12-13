// src/components/updates/AddUpdate.jsx
import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { useAuth } from "../../context/AuthContext";

/**
 * props:
 *  - complaintId (string)
 *  - onAdded (optional callback when added)
 */
export default function AddUpdate({ complaintId, onAdded }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!complaintId) return;
    if (!text.trim() && !status) return alert("Write something or change status.");

    setSaving(true);
    try {
      const colRef = collection(db, "complaints", complaintId, "updates");
      const docRef = await addDoc(colRef, {
        text: text.trim(),
        status: status || null,
        author: user.uid,
        authorName: user.name || user.email || null,
        createdAt: serverTimestamp(),
      });
      setText("");
      setStatus("");
      if (onAdded) onAdded({ id: docRef.id });
    } catch (err) {
      console.error("Add update failed:", err);
      alert("Failed to add update: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 16 }}>
      <h4>Post update</h4>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write progress update, actions taken, small notes..."
        rows={3}
        style={{ width: "100%", padding: 8, borderRadius: 6, background: "rgba(255,255,255,0.02)", color: "#fff" }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
          <option value="">— keep status —</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <button type="submit" disabled={saving} style={{ padding: "8px 14px", borderRadius: 6 }}>
          {saving ? "Posting…" : "Post update"}
        </button>
      </div>
    </form>
  );
}
