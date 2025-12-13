import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("officer"); // default role for CRMS
  const [error, setError] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await signup(email, password, name, role);
      navigate("/");
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message);
    }
  };

  return (
    <div style={{ 
      maxWidth: "500px", 
      margin: "60px auto", 
      padding: "40px",
      background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.08))",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "16px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
    }}>
      <h2 style={{ marginBottom: "24px", textAlign: "center" }}>Sign Up</h2>

      {error && (
        <div className="error" style={{ marginBottom: "16px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSignup}>
        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

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

        <div style={{ marginBottom: "16px" }}>
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

        <div style={{ marginBottom: "20px" }}>
          <label htmlFor="role">Role</label>
          <select 
            id="role"
            value={role} 
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="officer">Officer</option>
            <option value="viewer">Viewer</option>
          </select>
          <div style={{ fontSize: "12px", color: "var(--muted, #a9b1b8)", marginTop: "6px" }}>
            Note: Admin role cannot be created through signup. Only one admin can exist in the system.
          </div>
        </div>

        <button type="submit" className="primary" style={{ width: "100%" }}>
          Sign Up
        </button>
      </form>
    </div>
  );
}
