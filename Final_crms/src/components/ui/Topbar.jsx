// src/components/ui/Topbar.jsx
import React from "react";

export default function Topbar({ onToggleSidebar, user, onLogout }) {
  return (
    <header className="ui-topbar">
      <div className="ui-topbar-left">
        <button className="ui-icon-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">☰</button>
        <div className="ui-brand">CRMS</div>
        <div className="ui-subtitle">Crime Record Management System</div>
      </div>

      <div className="ui-topbar-right">
        <div className="ui-user">
          <div className="ui-user-name">{user?.name || user?.email || "Unknown"}</div>
          <button className="ui-logout" onClick={onLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
}
