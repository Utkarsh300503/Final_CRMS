import React from "react";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <div>
      <div className="page-header">
        <h1>Welcome, {user?.name || "User"}</h1>
        <p style={{ color: "var(--muted, #a9b1b8)", marginTop: "8px" }}>
          Crime Record Management System Dashboard
        </p>
      </div>

      <div className="page-body">
        <div className="card" style={{ maxWidth: "600px" }}>
          <h3 style={{ marginTop: 0 }}>Account Information</h3>
          <div style={{ marginBottom: "12px" }}>
            <strong>Email:</strong> <span style={{ color: "var(--muted, #a9b1b8)" }}>{user?.email}</span>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <strong>Role:</strong> <span style={{ 
              color: "var(--accent, #2f6fff)", 
              textTransform: "capitalize",
              fontWeight: 600
            }}>{user?.role || "user"}</span>
          </div>
          {user?.name && (
            <div style={{ marginBottom: "12px" }}>
              <strong>Name:</strong> <span style={{ color: "var(--muted, #a9b1b8)" }}>{user.name}</span>
            </div>
          )}
        </div>

        <div className="card" style={{ maxWidth: "600px", marginTop: "20px" }}>
          <h3 style={{ marginTop: 0 }}>Quick Actions</h3>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button onClick={() => window.location.href = "/officer/list"} className="primary">
              View Complaints
            </button>
            <button onClick={() => window.location.href = "/officer/create"}>
              Create Complaint
            </button>
            {user?.role === "admin" && (
              <button onClick={() => window.location.href = "/admin/users"}>
                Manage Users
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
