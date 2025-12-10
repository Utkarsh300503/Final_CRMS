// src/components/ui/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";

export default function Sidebar({ collapsed }) {
  return (
    <aside className={`ui-sidebar ${collapsed ? "collapsed" : ""}`}>
      <nav>
        <NavLink to="/" className="ui-nav-item" end>🏠 Dashboard</NavLink>
        <NavLink to="/officer/list" className="ui-nav-item">🗂 Complaints</NavLink>
        <NavLink to="/officer/create" className="ui-nav-item">✍️ New Complaint</NavLink>
        <NavLink to="/officer/list?status=open" className="ui-nav-item">🔎 Open</NavLink>
        <NavLink to="/admin" className="ui-nav-item">🛠 Admin</NavLink>
      </nav>

      <div className="ui-sidebar-footer">
        <div className="small">v1.0</div>
      </div>
    </aside>
  );
}
