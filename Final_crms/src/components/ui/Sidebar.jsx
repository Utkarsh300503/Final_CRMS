// src/components/ui/Sidebar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();

  const isActive = (path) => loc.pathname.startsWith(path);

  return (
    <aside className="app-sidebar">
      <div className="logo" onClick={() => nav("/")}>CRMS</div>

      <nav className="links">
        <div className={`link ${isActive("/") ? "active" : ""}`} onClick={() => nav("/")}>
          🏠 Dashboard
        </div>

        <div className={`link ${isActive("/officer/list") ? "active" : ""}`} onClick={() => nav("/officer/list")}>
          📂 Complaints
        </div>

        <div className={`link ${isActive("/officer/create") ? "active" : ""}`} onClick={() => nav("/officer/create")}>
          📝 New Complaint
        </div>

        {/* admin-only link */}
        {user?.role === "admin" && (
          <div
            className={`link ${isActive("/admin/users") ? "active" : ""}`}
            onClick={() => nav("/admin/users")}
          >
            👥 Manage Users
          </div>
        )}
      </nav>
    </aside>
  );
}
