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
    <form onSubmit={submit} className="card" style={{ marginTop: "20px" }}>
      <h4 style={{ marginTop: 0, marginBottom: "16px" }}>Post Update</h4>

      <div style={{ marginBottom: "16px" }}>
        <label htmlFor="update-text">Update Text</label>
        <textarea
          id="update-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write progress update, actions taken, small notes..."
          rows={4}
        />
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label htmlFor="update-status">Change Status (Optional)</label>
          <select 
            id="update-status"
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">— keep status —</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <button type="submit" disabled={saving} className="primary" style={{ height: "fit-content", marginTop: "20px" }}>
          {saving ? "Posting…" : "Post Update"}
        </button>
      </div>
    </form>
  );
}
