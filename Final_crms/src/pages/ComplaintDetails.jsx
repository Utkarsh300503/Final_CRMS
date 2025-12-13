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
    <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }}>
      <div>
        <button onClick={() => nav(-1)} style={{ marginBottom: 18 }}>⬅ Back</button>

        <h2>{c.title || "Untitled complaint"}</h2>

        <div style={{ marginTop: 12 }}>
          <p><strong>Description:</strong></p>
          <p style={{ color: "var(--muted, #aaa)" }}>{c.description}</p>

          <p><strong>Status:</strong> {c.status}</p>
          <p><strong>Created By:</strong> {c.createdByName || c.createdBy}</p>
          <p><strong>Assigned Officer:</strong> {c.assignedOfficerName || c.assignedOfficer}</p>
        </div>

        <hr style={{ margin: "18px 0", borderColor: "rgba(255,255,255,0.04)" }} />

        {/* EVIDENCE LIST */}
        <section>
          <h3>Evidence</h3>

          {(!c.evidence || c.evidence.length === 0) && (
            <div style={{ color: "var(--muted,#aaa)" }}>
              No evidence attached yet.
            </div>
          )}

          <ul style={{ listStyle: "none", paddingLeft: 0, marginTop: 12 }}>
            {(c.evidence || []).map((ev) => (
              <li key={ev.id} style={{
                padding: 12,
                marginBottom: 10,
                borderRadius: 8,
                background: "rgba(255,255,255,0.02)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{ev.filename || ev.id}</div>
                    <div style={{ color: "var(--muted,#aaa)", fontSize: 13 }}>
                      {ev.uploaderName || ev.uploaderUid} • {ev.mimeType || "—"} {ev.size ? `• ${Math.round(ev.size/1024)} KB` : ""}
                    </div>
                    <div style={{ color: "var(--muted,#aaa)", fontSize: 12 }}>
                      {ev.storageEnabled ? "File stored" : "Storage not enabled — placeholder metadata"}
                    </div>
                    {ev.note && <div style={{ color: "salmon", marginTop: 6 }}>{ev.note}</div>}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    {ev.storageEnabled && ev.url ? (
                      <a href={ev.url} target="_blank" rel="noreferrer">
                        View
                      </a>
                    ) : (
                      <button
                        onClick={() => alert("Storage is disabled. Enable Firebase Storage (Blaze) to view files.")}
                        style={{ padding: "6px 10px", borderRadius: 6 }}
                      >
                        Preview
                      </button>
                    )}

                    {user.role === "admin" && (
                      <button
                        onClick={() => handleRemoveEvidence(ev)}
                        style={{ padding: "6px 10px", borderRadius: 6, background: "transparent", border: "1px solid rgba(255,0,0,0.08)" }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <hr style={{ margin: "18px 0", borderColor: "rgba(255,255,255,0.04)" }} />

        {/* Timeline */}
        <section>
          <h3>Timeline</h3>
          {(c.timeline && c.timeline.length > 0) ? (
            <ul>
              {c.timeline.map((t, idx) => (
                <li key={idx}>
                  <div style={{ fontWeight: 600 }}>{t.summary}</div>
                  <div style={{ fontSize: 13, color: "var(--muted,#aaa)" }}>{t.byName || t.by || ""} • {new Date(t.ts?.toDate ? t.ts.toDate() : t.ts || Date.now()).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: "var(--muted,#aaa)" }}>No updates yet</div>
          )}
        </section>
      </div>

      {/* Right panel */}
      <aside>
        <div style={{
          padding: 18,
          borderRadius: 10,
          background: "var(--panel,#111)",
          boxShadow: "0 6px 14px rgba(0,0,0,0.35)"
        }}>
          <h4 style={{ marginTop: 0 }}>Update Complaint</h4>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Status</label>
            <select
              value={c.status}
              onChange={(e) => updateStatus(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 6 }}
            >
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* --------- Evidence upload UI --------- */}
          <div style={{ marginTop: 10 }}>
            <h4 style={{ marginBottom: 8 }}>Attach Evidence</h4>

            <div style={{ marginBottom: 8 }}>
              <button onClick={onChooseFile} style={{ padding: "8px 12px", borderRadius: 6 }}>
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
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 13, marginBottom: 6 }}>Preview</div>
                <div style={{ borderRadius: 8, overflow: "hidden", marginBottom: 6 }}>
                  {selectedFile && selectedFile.type?.startsWith("image/") ? (
                    <img src={previewUrl} alt="preview" style={{ width: "100%", height: "160px", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: 160, display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f0f" }}>
                      <div style={{ color: "var(--muted,#aaa)" }}>{selectedFile?.name}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {evidenceError && <div style={{ color: "salmon", marginBottom: 8 }}>{evidenceError}</div>}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleUpload} disabled={uploading || !selectedFile} style={{ padding: "8px 12px", borderRadius: 6 }}>
                {uploading ? "Uploading…" : "Upload (mock)"}
              </button>

              <button onClick={() => { setSelectedFile(null); if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } }} style={{ padding: "8px 12px", borderRadius: 6 }}>
                Cancel
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted,#aaa)" }}>
              Note: Actual file storage is disabled in this project (Firebase Storage requires Blaze plan).
              This UI stores metadata only. Toggle <button onClick={() => setShowUploadHelp(s => !s)} style={{ background: "transparent", color: "#6bcaff", border: "none", cursor: "pointer" }}>help</button> for instructions to enable.
            </div>

            {showUploadHelp && (
              <div style={{ marginTop: 8, background: "#111", padding: 10, borderRadius: 6 }}>
                <div style={{ color: "var(--muted,#aaa)", fontSize: 13 }}>
                  To enable real uploads:
                  <ol style={{ marginTop: 8 }}>
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
  );
}
