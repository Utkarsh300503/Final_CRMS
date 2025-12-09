// src/components/RoleProtected.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RoleProtected({ allowed = [], children }) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{padding:20}}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // if allowed array empty, allow any authenticated user
  if (allowed.length === 0) return children;

  if (!allowed.includes(user.role)) {
    return <div style={{ padding: 20 }}>Access denied — insufficient role.</div>;
  }

  return children;
}
