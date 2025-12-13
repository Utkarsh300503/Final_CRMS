// src/pages/Login.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loadingBtn, setLoadingBtn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoadingBtn(true);
    console.log("Login clicked", { email });

    try {
      const result = await login(email, password);
      console.log("login() resolved:", result.user?.uid ?? result.user);
      // success — navigate to home/dashboard
      navigate("/");
    } catch (err) {
      console.error("login() failed:", err);
      // show friendly message but keep console error for debugging
      setError(err?.message || "Login failed. Check credentials or network.");
    } finally {
      setLoadingBtn(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: "420px", 
      margin: "80px auto", 
      padding: "40px",
      background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.08))",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "16px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
    }}>
      <h2 style={{ marginBottom: "24px", textAlign: "center" }}>Login</h2>

      {error && (
        <div className="error" style={{ marginBottom: "16px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loadingBtn}
          className="primary"
          style={{ width: "100%" }}
        >
          {loadingBtn ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
