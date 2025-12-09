// src/pages/OfficerDashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function OfficerDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Officer Dashboard</h1>
      <p>Officer: <strong>{user?.name || user?.email}</strong></p>

      <div style={{ marginTop: 20 }}>
        <button onClick={() => nav("/officer/create")} style={{ marginRight: 12 }}>
          Create Complaint
        </button>
        <button onClick={() => nav("/officer/list")}>
          View All Complaints
        </button>
      </div>
    </div>
  );
}
