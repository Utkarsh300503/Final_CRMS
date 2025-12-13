// src/pages/ComplaintDetails.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";

/**
 * Complaint details page with Evidence upload UI.
 *
 * Upload behavior:
 * - Real Storage uploads are DISABLED in this build (you chose not to enable Blaze plan).
 * - We still provide the full UI and a mock upload flow that inserts a placeholder evidence
 *   object into the complaint's 'evidence' array in Firestore (so UI looks real).
 *
 * To enable real upload later:
 * - Uncomment the firebase/storage imports and the code in handleUpload
 * - Enable Blaze plan + Cloud Storage in Firebase console
 * - Ensure Firestore & Storage rules permit the operations
 */

export default function ComplaintDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  // Evidence UI state
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null); // File object
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");
  const [showUploadHelp, setShowUploadHelp] = useState(false);

  // ---------- fetch complaint ----------
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "complaints", id));
        if (!snap.exists()) {
          setError("Complaint not found");
          return;
        }
        if (mounted) setC({ id: snap.id, ...snap.data() });
      } catch (err) {
        setError(err.message || "Failed to load complaint");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [id]);

  // ---------- status update ----------
  async function updateStatus(newStatus) {
    if (!c) return;
    if (user.role !== "admin" && user.uid !== c.assignedOfficer) {
      alert("You are not allowed to update this complaint.");
      return;
    }

    setUpdating(true);
    try {
      await updateDoc(doc(db, "complaints", c.id), { status: newStatus });
      setC((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert("Update failed: " + err.message);
    } finally {
      setUpdating(false);
    }
  }

  // ---------- evidence helpers ----------
  function onChooseFile() {
    setEvidenceError("");
    fileInputRef.current && fileInputRef.current.click();
  }

  function handleFileSelect(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // basic client-side validations
    if (f.size > 10 * 1024 * 1024) { // 10MB cap for preview/mocks
      setEvidenceError("File too large (max 10 MB for preview).");
      return;
    }
    setSelectedFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  }

  async function handleUpload() {
    if (!selectedFile) return setEvidenceError("Choose a file first.");
    setUploading(true);
    setEvidenceError("");

    try {
      // ---------- MOCK BEHAVIOR (no Storage) ----------
      // We create a placeholder evidence object and store it in Firestore
      // so UI looks real. The actual binary isn't uploaded.
      const mockEvidence = {
        id: `mock_${Date.now()}`, // client-generated id for UI
        filename: selectedFile.name,
        mimeType: selectedFile.type || "application/octet-stream",
        size: selectedFile.size,
        uploaderUid: user.uid,
        uploaderName: user.name || user.email || null,
        createdAt: serverTimestamp(),
        // flag to indicate there's no storage URL yet
        storageEnabled: false,
        // placeholder note for the interviewer
        note: "Storage not enabled in this project. This is a mock evidence entry."
      };

      // Persist the mock metadata to Firestore (so evidence shows for other users too).
      // If your Firestore rules block this write for the current user, this will fail.
      await updateDoc(doc(db, "complaints", c.id), {
        evidence: arrayUnion(mockEvidence)
      });

      // Update local UI
      setC((prev) => ({
        ...prev,
        evidence: [...(prev.evidence || []), mockEvidence]
      }));

      // Clean selection
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      alert(
        "Mock upload complete. The UI shows evidence metadata. Actual file storage is disabled — enable Firebase Storage (Blaze) to store binaries."
      );
    } catch (err) {
      console.error("Mock upload failed:", err);
      setEvidenceError(err.message || "Failed to save evidence metadata.");
    } finally {
      setUploading(false);
    }

    // ---------- REAL UPLOAD (uncomment to enable when you have Blaze & Storage) ----------
    /*
    // import these at top if enabling real uploads:
    // import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
    try {
      const storage = getStorage();
      const path = `evidence/${c.id}/${Date.now()}_${selectedFile.name}`;
      const sRef = storageRef(storage, path);
      const uploadTask = uploadBytesResumable(sRef, selectedFile);

      uploadTask.on("state_changed", snapshot => {
         // progress if you want
      }, error => {
         setEvidenceError(error.message || "Upload failed");
      }, async () => {
         const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
         const evidenceRecord = {
           id: `${Date.now()}`,
           filename: selectedFile.name,
           mimeType: selectedFile.type,
           size: selectedFile.size,
           url: downloadURL,
           uploaderUid: user.uid,
           uploaderName: user.name || user.email || null,
           createdAt: serverTimestamp(),
           storageEnabled: true
         };
         await updateDoc(doc(db, "complaints", c.id), {
           evidence: arrayUnion(evidenceRecord)
         });
         setC(prev => ({ ...prev, evidence: [...(prev.evidence||[]), evidenceRecord] }));
         // cleanup
         setSelectedFile(null);
         if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
         alert("Upload complete.");
      });
    } catch (err) {
      setEvidenceError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
    */
  }

  // ---------- remove evidence (admin only) ----------
  async function handleRemoveEvidence(ev) {
    if (!window.confirm("Remove this evidence entry?")) return;
    if (user.role !== "admin") {
      alert("Only admins can remove evidence.");
      return;
    }
    try {
      // serverTimestamp not needed; we use update to set array without that item
      const remaining = (c.evidence || []).filter((x) => x.id !== ev.id);
      await updateDoc(doc(db, "complaints", c.id), { evidence: remaining });
      setC((prev) => ({ ...prev, evidence: remaining }));
    } catch (err) {
      alert("Remove failed: " + (err.message || err));
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: "salmon" }}>Error: {error}</div>;
  if (!c) return null;

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => nav(-1)} style={{ marginBottom: "0" }}>
          ← Back
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "24px" }}>
        <div>
          <div className="page-header" style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
              <h2 style={{ margin: 0 }}>{c.title || "Untitled complaint"}</h2>
              <span className={`status-pill status-${c.status || "open"}`}>
                {c.status || "open"}
              </span>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "24px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Description</h3>
            <p style={{ color: "var(--muted, #a9b1b8)", lineHeight: "1.6", marginBottom: "20px" }}>{c.description}</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <strong style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--muted, #a9b1b8)" }}>Status</strong>
                <span style={{ textTransform: "capitalize" }}>{c.status}</span>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--muted, #a9b1b8)" }}>Created By</strong>
                <span>{c.createdByName || c.createdBy}</span>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--muted, #a9b1b8)" }}>Assigned Officer</strong>
                <span>{c.assignedOfficerName || c.assignedOfficer}</span>
              </div>
            </div>
          </div>

          {/* EVIDENCE LIST */}
          <section className="card" style={{ marginBottom: "24px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Evidence</h3>

            {(!c.evidence || c.evidence.length === 0) && (
              <div style={{ color: "var(--muted, #a9b1b8)", padding: "20px", textAlign: "center" }}>
                No evidence attached yet.
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {(c.evidence || []).map((ev) => (
                <div key={ev.id} className="card" style={{ padding: "16px", margin: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: "8px" }}>{ev.filename || ev.id}</div>
                      <div style={{ color: "var(--muted, #a9b1b8)", fontSize: "13px", marginBottom: "4px" }}>
                        {ev.uploaderName || ev.uploaderUid} • {ev.mimeType || "—"} {ev.size ? `• ${Math.round(ev.size/1024)} KB` : ""}
                      </div>
                      <div style={{ color: "var(--muted, #a9b1b8)", fontSize: "12px" }}>
                        {ev.storageEnabled ? "✓ File stored" : "⚠ Storage not enabled — placeholder metadata"}
                      </div>
                      {ev.note && <div style={{ color: "#ff6b6b", marginTop: "8px", fontSize: "12px" }}>{ev.note}</div>}
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      {ev.storageEnabled && ev.url ? (
                        <a href={ev.url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "13px" }}>
                          View
                        </a>
                      ) : (
                        <button
                          onClick={() => alert("Storage is disabled. Enable Firebase Storage (Blaze) to view files.")}
                          style={{ padding: "6px 12px", fontSize: "13px" }}
                        >
                          Preview
                        </button>
                      )}

                      {user.role === "admin" && (
                        <button
                          onClick={() => handleRemoveEvidence(ev)}
                          className="danger"
                          style={{ padding: "6px 12px", fontSize: "13px" }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Timeline */}
          <section className="card">
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Timeline</h3>
            {(c.timeline && c.timeline.length > 0) ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {c.timeline.map((t, idx) => (
                  <div key={idx} style={{ padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                    <div style={{ fontWeight: 600, marginBottom: "6px" }}>{t.summary}</div>
                    <div style={{ fontSize: "13px", color: "var(--muted, #a9b1b8)" }}>
                      {t.byName || t.by || ""} • {new Date(t.ts?.toDate ? t.ts.toDate() : t.ts || Date.now()).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--muted, #a9b1b8)", padding: "20px", textAlign: "center" }}>No updates yet</div>
            )}
          </section>
        </div>

        {/* Right panel */}
        <aside>
          <div className="card" style={{ position: "sticky", top: "80px" }}>
            <h4 style={{ marginTop: 0, marginBottom: "20px" }}>Update Complaint</h4>

            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="status-select">Status</label>
              <select
                id="status-select"
                value={c.status}
                onChange={(e) => updateStatus(e.target.value)}
                disabled={updating}
              >
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* --------- Evidence upload UI --------- */}
            <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <h4 style={{ marginBottom: "12px" }}>Attach Evidence</h4>

              <div style={{ marginBottom: "12px" }}>
                <button onClick={onChooseFile} type="button">
                  Choose file…
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                  accept="image/*,video/*,application/pdf"
                />
              </div>

              {previewUrl && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "13px", marginBottom: "8px", color: "var(--muted, #a9b1b8)" }}>Preview</div>
                  <div style={{ borderRadius: "8px", overflow: "hidden", marginBottom: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {selectedFile && selectedFile.type?.startsWith("image/") ? (
                      <img src={previewUrl} alt="preview" style={{ width: "100%", height: "160px", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ width: "100%", height: "160px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.02)" }}>
                        <div style={{ color: "var(--muted, #a9b1b8)" }}>{selectedFile?.name}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {evidenceError && <div className="error" style={{ marginBottom: "12px", fontSize: "12px" }}>{evidenceError}</div>}

              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <button onClick={handleUpload} disabled={uploading || !selectedFile} className="primary" style={{ flex: 1 }}>
                  {uploading ? "Uploading…" : "Upload (mock)"}
                </button>

                {selectedFile && (
                  <button 
                    onClick={() => { setSelectedFile(null); if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } }} 
                    type="button"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--muted, #a9b1b8)", lineHeight: "1.5" }}>
                Note: Actual file storage is disabled in this project (Firebase Storage requires Blaze plan).
                This UI stores metadata only.{" "}
                <button 
                  onClick={() => setShowUploadHelp(s => !s)} 
                  style={{ background: "transparent", color: "#6bcaff", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0, fontSize: "12px" }}
                >
                  {showUploadHelp ? "Hide help" : "Show help"}
                </button>
              </div>

              {showUploadHelp && (
                <div style={{ marginTop: "12px", background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px" }}>
                  <div style={{ color: "var(--muted, #a9b1b8)", fontSize: "12px" }}>
                    <strong style={{ display: "block", marginBottom: "8px", color: "var(--text, #e6e6e6)" }}>To enable real uploads:</strong>
                    <ol style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.8" }}>
                      <li>Upgrade Firebase project to the Blaze plan.</li>
                      <li>Enable Cloud Storage and set proper Storage rules.</li>
                      <li>Uncomment the firebase/storage code in this file and import the methods.</li>
                      <li>Test real uploads and optionally store download URL in evidence record.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
