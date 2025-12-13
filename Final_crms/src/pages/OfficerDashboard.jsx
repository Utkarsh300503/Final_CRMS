// src/pages/OfficerDashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function OfficerDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();

  return (
    <div>
      <div className="page-header">
        <h1>Officer Dashboard</h1>
        <p style={{ color: "var(--muted, #a9b1b8)", marginTop: "8px" }}>
          Welcome, <strong>{user?.name || user?.email}</strong>
        </p>
      </div>

      <div className="page-body">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "24px" }}>
          <div className="card" style={{ cursor: "pointer" }} onClick={() => nav("/officer/create")}>
            <h3 style={{ marginTop: 0, color: "var(--accent, #2f6fff)" }}>📝 Create Complaint</h3>
            <p style={{ color: "var(--muted, #a9b1b8)", marginBottom: 0 }}>
              File a new complaint or incident report
            </p>
          </div>

          <div className="card" style={{ cursor: "pointer" }} onClick={() => nav("/officer/list")}>
            <h3 style={{ marginTop: 0, color: "var(--accent, #2f6fff)" }}>📂 View Complaints</h3>
            <p style={{ color: "var(--muted, #a9b1b8)", marginBottom: 0 }}>
              Browse and manage all complaints
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={() => nav("/officer/create")} className="primary">
            Create New Complaint
          </button>
          <button onClick={() => nav("/officer/list")}>
            View All Complaints
          </button>
        </div>
      </div>
    </div>
  );
}
