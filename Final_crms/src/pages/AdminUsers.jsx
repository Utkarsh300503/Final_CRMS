// src/pages/AdminUsers.jsx
import React, { useEffect, useState } from "react";
import { fetchAllUsers, updateUserRole, deleteUserDoc } from "../utils/users";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

/**
 * Admin — User Management page
 *
 * - Lists all users from /users collection
 * - Admin can change role (admin/officer/user)
 * - Admin can delete user document (Firestore only)
 *
 * Put this at src/pages/AdminUsers.jsx
 */

const roleOptions = ["admin", "officer", "user"];

export default function AdminUsers() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingUid, setSavingUid] = useState(null);
  const [deletingUid, setDeletingUid] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    // only admins should be here (RoleProtected should already guard route).
    (async () => {
      setLoading(true);
      setError("");
      try {
        const list = await fetchAllUsers();
        setUsers(list);
      } catch (e) {
        console.error("fetchAllUsers failed", e);
        setError(e.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function handleRoleChange(uid, newRole) {
    setSavingUid(uid);
    setError("");
    try {
      await updateUserRole(uid, newRole);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
    } catch (e) {
      console.error("updateUserRole failed", e);
      setError(e.message || "Failed to update role");
    } finally {
      setSavingUid(null);
    }
  }

  async function handleDelete(uid) {
    if (!confirm("Delete this user *document*? This will NOT remove their Firebase Auth account. Continue?")) return;
    setDeletingUid(uid);
    setError("");
    try {
      await deleteUserDoc(uid);
      setUsers((prev) => prev.filter((p) => p.uid !== uid));
    } catch (e) {
      console.error("deleteUserDoc failed", e);
      setError(e.message || "Delete failed");
    } finally {
      setDeletingUid(null);
    }
  }

  if (!user) return null; // shouldn't happen due to ProtectedRoute

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
          <h1>Admin — User Management</h1>
          <div style={{ color: "var(--muted, #a9b1b8)", fontSize: "14px" }}>
            Signed in as: <strong>{user.name || user.email}</strong>
          </div>
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: "16px" }}>{error}</div>}

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <div className="loading">Loading users…</div>
        </div>
      ) : users.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--muted, #a9b1b8)" }}>
          No users found
        </div>
      ) : (
        <div style={{ maxWidth: "1000px" }}>
          {users.map((u) => (
            <div
              key={u.uid}
              className="card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "1 1 300px" }}>
                <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "6px" }}>
                  {u.name || u.email || u.uid}
                </div>
                <div style={{ fontSize: "13px", color: "var(--muted, #a9b1b8)", marginBottom: "4px" }}>
                  {u.email || u.uid}
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted, #a9b1b8)" }}>
                  Created: {u.createdAt && u.createdAt.toDate ? u.createdAt.toDate().toLocaleString() : u.createdAt || "—"}
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <select
                  value={u.role || "user"}
                  onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                  disabled={savingUid === u.uid || u.uid === user.uid}
                  style={{ minWidth: "120px" }}
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => nav(`/complaint?createdBy=${u.uid}`)}
                  title="Show complaints by this user"
                  className="btn-secondary"
                  style={{ fontSize: "13px", padding: "8px 12px" }}
                >
                  View Complaints
                </button>

                <button
                  onClick={() => handleDelete(u.uid)}
                  disabled={deletingUid === u.uid || u.uid === user.uid}
                  className="danger"
                  style={{ fontSize: "13px", padding: "8px 12px" }}
                >
                  {deletingUid === u.uid ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
