import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";

export default function ComplaintDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "complaints", id));
        if (!snap.exists()) {
          setError("Complaint not found");
          return;
        }
        setC({ id: snap.id, ...snap.data() });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function updateStatus(newStatus) {
    if (!c) return;
    if (user.role !== "admin" && user.uid !== c.assignedOfficer) {
      alert("You are not allowed to update this complaint.");
      return;
    }

    setUpdating(true);
    try {
      await updateDoc(doc(db, "complaints", c.id), {
        status: newStatus
      });
      setC((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert("Update failed: " + err.message);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20 }}>Error: {error}</div>;

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate(-1)}>⬅ Back</button>

      <h2>{c.title}</h2>
      <p><strong>Description:</strong> {c.description}</p>
      <p><strong>Status:</strong> {c.status}</p>

      <p><strong>Created By:</strong> {c.createdByName}</p>
      <p><strong>Assigned Officer:</strong> {c.assignedOfficerName}</p>

      {(user.role === "admin" || user.uid === c.assignedOfficer) && (
        <>
          <h3>Update Status</h3>
          <select
            value={c.status}
            onChange={(e) => updateStatus(e.target.value)}
            disabled={updating}
          >
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </>
      )}
    </div>
  );
}
