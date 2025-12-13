// src/components/ui/EvidenceList.jsx
import React, { useState } from "react";
import { ref, deleteObject, getDownloadURL } from "firebase/storage";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { storage, db } from "../../utils/firebase";
import { useAuth } from "../../context/AuthContext";

/**
 * evidence: array of evidence meta objects from complaint doc
 * complaintId: string
 * canModify: boolean (if true show delete)
 * onDeleted callback
 */
export default function EvidenceList({ complaintId, evidence = [], onDeleted }) {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete(ev) {
    if (!ev || !ev.storagePath) return;
    const ok = window.confirm("Delete this evidence? This will remove the file and metadata.");
    if (!ok) return;

    setDeleting(true);
    setError("");
    try {
      // delete storage object
      const fileRef = ref(storage, ev.storagePath);
      await deleteObject(fileRef);

      // fetch complaint doc, filter evidence and update
      const cRef = doc(db, "complaints", complaintId);
      const cSnap = await getDoc(cRef);
      if (!cSnap.exists()) throw new Error("Complaint not found");
      const data = cSnap.data() || {};
      const arr = (data.evidence || []).filter((x) => x.id !== ev.id);
      await updateDoc(cRef, { evidence: arr });

      onDeleted && onDeleted(ev);
    } catch (err) {
      console.error("Failed delete evidence:", err);
      setError(err.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function renderPreview(e) {
    if (!e || !e.type) return null;
    if (e.type.startsWith("image/")) {
      return <img src={e.url} alt={e.name} style={{ width: 120, height: "auto", borderRadius: 6 }} />;
    }
    // otherwise show file icon and link
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontWeight: 600 }}>{e.name}</div>
        <a href={e.url} target="_blank" rel="noreferrer">Open / Download</a>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <h4>Evidence</h4>
      {error && <div style={{ color: "salmon" }}>{error}</div>}
      {!evidence || evidence.length === 0 ? (
        <div>No evidence attached.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
          {evidence.map((ev) => (
            <div key={ev.id} style={{ padding: 12, borderRadius: 8, background: "var(--panel,#141414)" }}>
              {renderPreview(ev)}
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted,#aaa)" }}>
                Uploaded by: {ev.uploadedByName || ev.uploadedBy}
              </div>
              <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                <a href={ev.url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>Open</a>
                {/* allow delete if user is assigned officer or admin; server rules will also enforce */}
                {(user && (user.role === "admin" || user.uid === ev.uploadedBy)) && (
                  <button disabled={deleting} onClick={() => handleDelete(ev)} style={{ marginLeft: "auto" }}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
