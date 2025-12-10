// src/components/ui/Layout.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./../../styles/ui.css";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const v = localStorage.getItem("crm_sidebar_collapsed");
    setCollapsed(v === "1");
  }, []);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("crm_sidebar_collapsed", next ? "1" : "0");
  }

  async function handleLogout() {
    try {
      if (logout) await logout();
    } catch (e) {
      console.error("Logout failed", e);
    }
  }

  const navItems = [
    { to: "/", label: "Dashboard", icon: "🏠" },
    { to: "/officer/list", label: "Complaints", icon: "📂" },
    { to: "/officer/create", label: "New Complaint", icon: "📝" },
    { to: "/officer/list?filter=open", label: "Open", icon: "🔎" },
    { to: "/admin", label: "Admin", icon: "⚙️" },
  ];

  return (
    <div className={`crm-root ${collapsed ? "sidebar-collapsed" : ""}`}>
      {/* Topbar */}
      <header className="app-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="burger"
            aria-label="Toggle sidebar"
            onClick={toggleSidebar}
          >
            ☰
          </button>

          <Link to="/" className="brand">
            <span className="brand-mark">CRMS</span>
            <span className="brand-text">Crime Record Management System</span>
          </Link>
        </div>

        <div className="topbar-right">
          <div className="user-info">
            <span className="username">{user?.name || user?.email?.split?.("@")?.[0] || "user"}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Layout main */}
      <div className="ui-main">
        <aside className={`app-sidebar ${collapsed ? "collapsed" : ""}`}>
          <nav>
            <ul className="nav-list">
              {navItems.map((it) => (
                <li
                  key={it.to}
                  className={`nav-item ${loc.pathname === it.to ? "active" : ""}`}
                >
                  <Link to={it.to} className="nav-link">
                    <span className="nav-icon" aria-hidden>
                      {it.icon}
                    </span>
                    <span className="nav-label">{it.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div style={{ flex: 1 }} />

          <div className="sidebar-footer">
            <button
              className="collapse-btn"
              onClick={toggleSidebar}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? "→" : "←"}
            </button>
          </div>
        </aside>

        <main className="ui-content">
          {/* page header */}
          <div className="page-header">
            {/* page title could be provided by children; kept minimal here */}
          </div>

          {/* page body */}
          <div className="page-body">{children}</div>
        </main>
      </div>
    </div>
  );
}
