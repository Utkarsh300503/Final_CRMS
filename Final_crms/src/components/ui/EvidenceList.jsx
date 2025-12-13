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
    <div style={{ marginTop: "12px" }}>
      <h4 style={{ marginBottom: "16px" }}>Evidence</h4>
      {error && <div className="error" style={{ marginBottom: "12px" }}>{error}</div>}
      {!evidence || evidence.length === 0 ? (
        <div style={{ color: "var(--muted, #a9b1b8)", padding: "20px", textAlign: "center" }}>
          No evidence attached.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: "16px" }}>
          {evidence.map((ev) => (
            <div key={ev.id} className="card" style={{ padding: "16px", margin: 0 }}>
              <div style={{ marginBottom: "12px" }}>
                {renderPreview(ev)}
              </div>
              <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--muted, #a9b1b8)", marginBottom: "12px" }}>
                Uploaded by: {ev.uploadedByName || ev.uploadedBy}
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {ev.url && (
                  <a href={ev.url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: "13px", padding: "6px 12px", flex: 1 }}>
                    Open
                  </a>
                )}
                {/* allow delete if user is assigned officer or admin; server rules will also enforce */}
                {(user && (user.role === "admin" || user.uid === ev.uploadedBy)) && (
                  <button 
                    disabled={deleting} 
                    onClick={() => handleDelete(ev)} 
                    className="danger"
                    style={{ fontSize: "13px", padding: "6px 12px" }}
                  >
                    {deleting ? "Deleting…" : "Delete"}
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
