// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Home from "./pages/Home";
import OfficerDashboard from "./pages/OfficerDashboard";
import CreateComplaint from "./pages/CreateComplaint";
import ComplaintList from "./pages/ComplaintList";
import ComplaintDetails from "./pages/ComplaintDetails";

import RoleProtected from "./components/RoleProtected";
import ProtectedRoute from "./components/ProtectedRoute";

import Layout from "./components/ui/Layout";
import "./styles/ui.css"; // UI styles (Topbar/Sidebar/Card etc.)

function AppRoutes() {
  const { user, logout } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />

      {/* Protected area wrapped with Layout */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout user={user} onLogout={logout}>
              <Routes>
                <Route path="/" element={<Home />} />

                <Route
                  path="/officer"
                  element={
                    <RoleProtected allowed={["officer", "admin"]}>
                      <OfficerDashboard />
                    </RoleProtected>
                  }
                />

                <Route
                  path="/officer/create"
                  element={
                    <RoleProtected allowed={["officer", "admin"]}>
                      <CreateComplaint />
                    </RoleProtected>
                  }
                />

                <Route
                  path="/officer/list"
                  element={
                    <RoleProtected allowed={["officer", "admin"]}>
                      <ComplaintList />
                    </RoleProtected>
                  }
                />

                <Route
                  path="/complaint/:id"
                  element={
                    <RoleProtected allowed={["officer", "admin"]}>
                      <ComplaintDetails />
                    </RoleProtected>
                  }
                />

                {/* fallback route inside protected area */}
                <Route path="*" element={<Home />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
