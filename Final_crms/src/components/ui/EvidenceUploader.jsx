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
    <div style={{ marginTop: 8 }}>
      <label style={{ display: "block", marginBottom: 6 }}>Add Evidence</label>
      <input
        type="file"
        accept={accept}
        onChange={onPick}
        disabled={busy}
      />
      {busy && <div style={{ marginTop: 6 }}>Uploading: {progress}%</div>}
      {error && <div style={{ color: "salmon", marginTop: 6 }}>{error}</div>}
    </div>
  );
}
