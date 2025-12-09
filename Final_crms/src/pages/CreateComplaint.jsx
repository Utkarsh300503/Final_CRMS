// src/pages/CreateComplaint.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";

export default function CreateComplaint() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If you later allow selecting a different officer, pass assignedOfficerUid here.
  const assignedOfficerUidDefault = user.uid;

  async function resolveUserName(uid) {
    // try to read users/{uid} for a nicer display name if available
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const d = snap.data();
        return d.name || d.email || uid;
      }
    } catch (e) {
      // ignore; fallback to uid
    }
    return uid;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !description.trim()) {
      setError("Title and description required");
      return;
    }

    setLoading(true);
    try {
      const colRef = collection(db, "complaints");

      // Denormalize names at write time to avoid extra reads later
      const createdByName = user?.name || user?.email || user?.uid;
      const assignedOfficerUid = assignedOfficerUidDefault;
      const assignedOfficerName = await resolveUserName(assignedOfficerUid);

      await addDoc(colRef, {
        title: title.trim(),
        description: description.trim(),
        createdBy: user.uid,
        createdByName,
        assignedOfficer: assignedOfficerUid,
        assignedOfficerName,
        createdAt: serverTimestamp(),
        status: "open",
      });

      navigate("/officer/list");
    } catch (err) {
      console.error("create complaint error", err);
      setError(err.message || "Failed to create complaint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Create Complaint</h2>
      {error && <div style={{ color: "crimson" }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div>
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div style={{ marginTop: 8 }}>
          <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={loading}>{loading ? "Creating..." : "Create"}</button>
        </div>
      </form>
    </div>
  );
}
