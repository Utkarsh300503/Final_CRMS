import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Home from "./pages/Home";
import OfficerDashboard from "./pages/OfficerDashboard";
import CreateComplaint from "./pages/CreateComplaint";
import ComplaintList from "./pages/ComplaintList";
import RoleProtected from "./components/RoleProtected";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute><Home /></ProtectedRoute>
          } />

          <Route path="/officer" element={
            <RoleProtected allowed={["officer","admin"]}>
              <OfficerDashboard />
            </RoleProtected>
          } />

          <Route path="/officer/create" element={
            <RoleProtected allowed={["officer","admin"]}>
              <CreateComplaint />
            </RoleProtected>
          } />

          <Route path="/officer/list" element={
            <RoleProtected allowed={["officer","admin"]}>
              <ComplaintList />
            </RoleProtected>
          } />


        </Routes>
      </AuthProvider>
    </Router>
  );
}
