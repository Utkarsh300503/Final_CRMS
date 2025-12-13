// src/components/ui/EvidenceUploader.jsx
import React, { useState } from "react";
import { uploadEvidence } from "../../utils/evidence";
import { useAuth } from "../../context/AuthContext";

export default function EvidenceUploader({ complaintId, onUploaded }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const accept = ".png,.jpg,.jpeg,.webp,.gif,.pdf,.mp4,.mov,.mp3";

  async function onPick(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setError("");
    setProgress(0);
    setBusy(true);

    try {
      const { task, finished } = await uploadEvidence(complaintId, f, {
        uid: user.uid,
        name: user.name || user.displayName || null,
        email: user.email || null
      });

      // monitor progress
      task.on("state_changed", (snap) => {
        const p = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setProgress(p);
      });

      const meta = await finished; // resolves when firestore metadata written
      setFile(null);
      setProgress(100);
      onUploaded && onUploaded(meta);
    } catch (err) {
      console.error("Upload failed", err);
      setError(err.message || "Upload failed");
    } finally {
      setBusy(false);
      setTimeout(() => setProgress(0), 800);
    }
  }

  return (
    <div style={{ marginTop: "16px" }}>
      <label htmlFor="evidence-file" style={{ display: "block", marginBottom: "8px" }}>Add Evidence</label>
      <input
        id="evidence-file"
        type="file"
        accept={accept}
        onChange={onPick}
        disabled={busy}
      />
      {busy && (
        <div style={{ marginTop: "12px" }}>
          <div style={{ marginBottom: "8px", fontSize: "14px", color: "var(--muted, #a9b1b8)" }}>
            Uploading: {progress}%
          </div>
          <progress value={progress} max="100" />
        </div>
      )}
      {error && <div className="error" style={{ marginTop: "12px" }}>{error}</div>}
    </div>
  );
}
