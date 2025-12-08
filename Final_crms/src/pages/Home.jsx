import React from "react";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Welcome, {user?.name || "User"}</h1>
      <p>Email: {user?.email}</p>
      <p>Role: {user?.role}</p>

      <button 
        onClick={logout}
        style={{ marginTop: "20px", padding: "10px 16px" }}
      >
        Logout
      </button>
    </div>
  );
}
