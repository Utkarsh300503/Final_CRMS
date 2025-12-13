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
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h1>Admin — User Management</h1>
        <div style={{ color: "rgba(255,255,255,0.6)" }}>Signed in as: <strong>{user.name || user.email}</strong></div>
      </div>

      {error && <div style={{ color: "salmon", marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div>Loading users…</div>
      ) : users.length === 0 ? (
        <div>No users found</div>
      ) : (
        <div style={{ maxWidth: 900 }}>
          {users.map((u) => (
            <div
              key={u.uid}
              style={{
                background: "rgba(255,255,255,0.02)",
                padding: 16,
                marginBottom: 12,
                borderRadius: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{u.name || u.email || u.uid}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{u.email || u.uid}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>
                  Created: {u.createdAt && u.createdAt.toDate ? u.createdAt.toDate().toLocaleString() : u.createdAt || "—"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={u.role || "user"}
                  onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                  disabled={savingUid === u.uid || u.uid === user.uid}
                  style={{ padding: "8px 10px", borderRadius: 6, background: "transparent", border: "1px solid rgba(255,255,255,0.06)" }}
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
                  style={{ padding: "8px 10px", borderRadius: 6 }}
                >
                  View Complaints
                </button>

                <button
                  onClick={() => handleDelete(u.uid)}
                  disabled={deletingUid === u.uid || u.uid === user.uid}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid rgba(255,90,90,0.16)",
                    background: "transparent",
                    color: "salmon",
                  }}
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
