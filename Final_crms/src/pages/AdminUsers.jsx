// src/pages/AdminUsers.jsx
import React, { useEffect, useState } from "react";
import { fetchAllUsers, updateUserRole, deleteUserDoc, adminExists } from "../utils/users";
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
  const [hasAdmin, setHasAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    // only admins should be here (RoleProtected should already guard route).
    (async () => {
      setLoading(true);
      setError("");
      try {
        const list = await fetchAllUsers();
        setUsers(list);
        
        // Check if admin exists
        const adminExistsResult = await adminExists();
        setHasAdmin(adminExistsResult);
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
    
    // Check if trying to create admin when one already exists
    if (newRole === "admin" && hasAdmin) {
      const currentUser = users.find(u => u.uid === uid);
      if (currentUser && currentUser.role !== "admin") {
        setError("An admin already exists. Only one admin is allowed. Please remove the existing admin first.");
        setSavingUid(null);
        return;
      }
    }
    
    try {
      await updateUserRole(uid, newRole);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
      
      // Update hasAdmin state
      if (newRole === "admin") {
        setHasAdmin(true);
      } else {
        // Check if any other user is admin
        const updatedUsers = users.map((u) => (u.uid === uid ? { ...u, role: newRole } : u));
        const stillHasAdmin = updatedUsers.some(u => u.role === "admin");
        setHasAdmin(stillHasAdmin);
      }
    } catch (e) {
      console.error("updateUserRole failed", e);
      setError(e.message || "Failed to update role");
    } finally {
      setSavingUid(null);
    }
  }

  async function handleDelete(uid) {
    const userToDelete = users.find(u => u.uid === uid);
    
    // Prevent deleting the last admin
    if (userToDelete && userToDelete.role === "admin" && hasAdmin) {
      const adminCount = users.filter(u => u.role === "admin").length;
      if (adminCount === 1) {
        setError("Cannot delete the last admin. At least one admin must exist in the system.");
        return;
      }
    }
    
    if (!confirm("Delete this user *document*? This will NOT remove their Firebase Auth account. Continue?")) return;
    setDeletingUid(uid);
    setError("");
    try {
      await deleteUserDoc(uid);
      const updatedUsers = users.filter((p) => p.uid !== uid);
      setUsers(updatedUsers);
      
      // Update hasAdmin state if admin was deleted
      if (userToDelete && userToDelete.role === "admin") {
        const stillHasAdmin = updatedUsers.some(u => u.role === "admin");
        setHasAdmin(stillHasAdmin);
      }
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
      
      {hasAdmin && (
        <div style={{ 
          marginBottom: "16px", 
          padding: "12px", 
          background: "rgba(255, 193, 7, 0.1)", 
          border: "1px solid rgba(255, 193, 7, 0.3)",
          borderRadius: "8px",
          color: "#ffc107",
          fontSize: "13px"
        }}>
          ⚠️ <strong>Security Notice:</strong> An admin already exists. Only one admin is allowed in the system. 
          You cannot create additional admin accounts.
        </div>
      )}

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
                  disabled={
                    savingUid === u.uid || 
                    u.uid === user.uid
                  }
                  style={{ minWidth: "120px" }}
                  title={
                    hasAdmin && u.role !== "admin" 
                      ? "Cannot create another admin. Only one admin allowed." 
                      : ""
                  }
                >
                  {roleOptions.map((r) => {
                    // Disable admin option if admin already exists and this user is not admin
                    const isAdminOption = r === "admin";
                    const shouldDisableOption = isAdminOption && hasAdmin && u.role !== "admin";
                    
                    return (
                      <option 
                        key={r} 
                        value={r}
                        disabled={shouldDisableOption}
                      >
                        {r}
                        {shouldDisableOption ? " (Admin exists)" : ""}
                      </option>
                    );
                  })}
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
                  disabled={
                    deletingUid === u.uid || 
                    u.uid === user.uid ||
                    (u.role === "admin" && hasAdmin && users.filter(usr => usr.role === "admin").length === 1)
                  }
                  className="danger"
                  style={{ fontSize: "13px", padding: "8px 12px" }}
                  title={
                    u.role === "admin" && hasAdmin && users.filter(usr => usr.role === "admin").length === 1
                      ? "Cannot delete the last admin"
                      : ""
                  }
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
