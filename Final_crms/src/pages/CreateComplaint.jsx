// src/pages/CreateComplaint.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";

export default function CreateComplaint() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedOfficer, setAssignedOfficer] = useState(user?.uid || "");
  const [files, setFiles] = useState([]); // FileList -> array
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // file input change -> store files array
  function handleFiles(e) {
    const list = Array.from(e.target.files || []);
    setFiles(list.slice(0, 5)); // limit to 5 files client-side (adjust as needed)
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!title.trim() || !description.trim()) {
      setError("Title and description required.");
      return;
    }
    if (!user) {
      setError("You must be logged in.");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      // 1) create a complaint doc placeholder to get ID
      const docRef = await addDoc(collection(db, "complaints"), {
        title: title.trim(),
        description: description.trim(),
        status: "open",
        createdBy: user.uid,
        assignedOfficer: assignedOfficer || null,
        createdAt: serverTimestamp(),
        imageURLs: [], // will fill after uploads
      });

      const complaintId = docRef.id;

      // 2) upload files sequentially (keeps memory low) and collect URLs
      const uploadedURLs = [];

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        // sanitize filename
        const cleanName = f.name.replace(/\s+/g, "_");
        const storagePath = `complaints/${complaintId}/${Date.now()}_${cleanName}`;
        const storageRef = ref(storage, storagePath);

        const uploadTask = uploadBytesResumable(storageRef, f);

        // await progress and completion
        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snap) => {
              // overall progress approximate (averages across files)
              const percent = Math.round(((i + snap.bytesTransferred / snap.totalBytes) / files.length) * 100);
              setUploadProgress(percent);
            },
            (err) => {
              console.error("Upload error", err);
              reject(err);
            },
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              uploadedURLs.push(url);
              resolve();
            }
          );
        });
      }

      // 3) update complaint doc with imageURLs
      if (uploadedURLs.length > 0) {
        await updateDoc(doc(db, "complaints", complaintId), {
          imageURLs: uploadedURLs,
        });
      }

      // done
      setUploadProgress(100);
      setLoading(false);

      // optional: navigate to complaint details or list
      nav(`/complaint/${complaintId}`);
    } catch (e) {
      console.error("Create complaint failed", e);
      setError("Failed to create complaint. See console.");
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <h2>Create Complaint</h2>

      {error && <div style={{ color: "salmon", marginBottom: 12 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief title"
            style={{ width: "100%", padding: 8, marginTop: 6 }}
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description"
            rows={6}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Attach images (max 5) — photos, screenshots</label>
          <input type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: "block", marginTop: 6 }} />
          {files.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <strong>Files:</strong> {files.map((f) => f.name).join(", ")}
            </div>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <button type="submit" disabled={loading}>
            {loading ? `Uploading... ${uploadProgress}%` : "Create complaint"}
          </button>
        </div>
      </form>

      {loading && (
        <div style={{ marginTop: 12 }}>
          <progress value={uploadProgress} max="100" style={{ width: "100%" }} />
        </div>
      )}
    </div>
  );
}
