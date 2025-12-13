// src/components/ui/Layout.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

/**
 * Layout component (Topbar + Sidebar + content)
 *
 * Props:
 * - user: { uid, name?, email?, role? }    // provided by App via AuthContext
 * - onLogout: function                      // provided by App (logout function)
 * - children: React nodes                   // page content
 *
 * Note: we DON'T import useAuth here to avoid path mismatches.
 */

const styles = {
  root: {
    display: "flex",
    minHeight: "100vh",
    background: "var(--bg, #141414)",
    color: "var(--text, #ddd)",
    fontFamily:
      "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  },
  sidebar: (collapsed) => ({
    width: collapsed ? 64 : 260,
    minWidth: collapsed ? 64 : 260,
    background: "var(--sidebar-bg, #111216)",
    color: "var(--sidebar-text, #bfc7cf)",
    paddingTop: 20,
    paddingBottom: 20,
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    overflow: "auto",
    boxShadow: "inset -2px 0 0 rgba(255,255,255,0.02)",
    transition: "width .18s ease",
    zIndex: 90,
  }),
  main: (collapsed) => ({
    marginLeft: collapsed ? 64 : 260,
    flex: 1,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    transition: "margin-left .18s ease",
  }),
  topbar: {
    height: 64,
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    borderBottom: "1px solid rgba(255,255,255,0.02)",
    justifyContent: "space-between",
    background: "transparent",
    zIndex: 20,
    position: "sticky",
    top: 0,
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandLogo: { fontWeight: 800, color: "#2EA6FF", fontSize: 20 },
  userBox: { display: "flex", gap: 12, alignItems: "center" },
  logoutBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.04)",
    color: "var(--text, #ddd)",
    cursor: "pointer",
  },
  navItem: (active, collapsed) => ({
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: collapsed ? "10px 8px" : "12px 16px",
    margin: "6px 12px",
    borderRadius: 8,
    color: active ? "#fff" : "var(--sidebar-text, #bfc7cf)",
    background: active ? "rgba(46,166,255,0.08)" : "transparent",
    textDecoration: "none",
    fontWeight: active ? 600 : 500,
  }),
  contentWrap: { padding: 28, paddingTop: 20, width: "100%" },
  small: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 6 },
};

export default function Layout({ user, onLogout, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  function isActive(path) {
    if (!location) return false;
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  }

  // prefer Vite env; fallback to simple string if not set
  const appVersion = (import.meta && import.meta.env && import.meta.env.VITE_APP_VERSION) || "1.0";

  return (
    <div style={styles.root}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar(collapsed)}>
        <div style={{ padding: "0 12px", marginBottom: 12 }}>
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label="Toggle sidebar"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--sidebar-text, #bfc7cf)",
              cursor: "pointer",
              padding: 8,
              fontSize: 18,
            }}
          >
            ☰
          </button>
        </div>

        <div style={{ margin: "6px 12px", display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              ...styles.brandLogo,
              width: collapsed ? 32 : "auto",
              textAlign: collapsed ? "center" : "left",
            }}
          >
            CRMS
          </div>
          {!collapsed && <div style={{ color: "rgba(255,255,255,0.6)" }}>Crime Record Management System</div>}
        </div>

        <nav style={{ marginTop: 18, paddingBottom: 80 }}>
          <Link to="/" style={styles.navItem(isActive("/"), collapsed)}>
            <span>🏠</span>
            {!collapsed && <div>Dashboard</div>}
          </Link>

          <Link to="/officer/list" style={styles.navItem(isActive("/officer/list"), collapsed)}>
            <span>📂</span>
            {!collapsed && <div>Complaints</div>}
          </Link>

          <Link to="/officer/create" style={styles.navItem(isActive("/officer/create"), collapsed)}>
            <span>📝</span>
            {!collapsed && <div>New Complaint</div>}
          </Link>

          <Link to="/officer/list" style={styles.navItem(isActive("/officer/list?filter=open"), collapsed)}>
            <span>🔎</span>
            {!collapsed && <div>Open</div>}
          </Link>

          {/* ADMIN SECTION — only render if user.role === 'admin' */}
          {user && user.role === "admin" && (
            <>
              <div style={{ height: 8 }} />
              <div style={{ margin: "6px 12px", color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Admin</div>

              <Link to="/admin/users" style={styles.navItem(isActive("/admin/users"), collapsed)}>
                <span>⚙️</span>
                {!collapsed && (
                  <div>
                    <div>Manage Users</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>View / edit / delete users</div>
                  </div>
                )}
              </Link>
            </>
          )}
        </nav>

        {/* bottom collapsed button area */}
        <div style={{ position: "absolute", bottom: 18, left: 8, width: "100%" }}>
          {!collapsed ? (
            <div style={{ padding: "8px 12px", color: "rgba(255,255,255,0.45)" }}>v{appVersion}</div>
          ) : (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.45)" }}>v1</div>
          )}
        </div>
      </aside>

      {/* MAIN AREA */}
      <div style={styles.main(collapsed)}>
        {/* TOPBAR */}
        <header style={styles.topbar}>
          <div style={styles.brand}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>Crime Record Management System</div>
          </div>

          <div style={styles.userBox}>
            {user && (
              <div style={{ textAlign: "right", marginRight: 8 }}>
                <div style={{ fontWeight: 700 }}>{user.name || user.email || "User"}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{user.role || "user"}</div>
              </div>
            )}

            <button onClick={() => onLogout && onLogout()} style={styles.logoutBtn} title="Logout">
              Logout
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div style={styles.contentWrap}>{children}</div>
      </div>
    </div>
  );
}
