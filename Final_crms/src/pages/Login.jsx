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
    <div style={{ maxWidth: "420px", margin: "48px auto", color: "#eee" }}>
      <h2>Login</h2>

      {error && (
        <div style={{ color: "crimson", marginBottom: 12 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <button
          type="submit"
          disabled={loadingBtn}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "1px solid #ccc",
            background: loadingBtn ? "#555" : "#111",
            color: "#fff",
            cursor: loadingBtn ? "not-allowed" : "pointer",
          }}
        >
          {loadingBtn ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
