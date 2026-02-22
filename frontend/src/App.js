import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";   // ✅ Added

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CategoryMaster from "./pages/CategoryMaster";
import ExamMaster from "./pages/ExamMaster";
import ExamView from "./pages/ExamView";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <Router>
      
      {/* ✅ Global Toast */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            fontWeight: 600,
            borderRadius: "8px",
          },
          success: {
            icon: "✅",
            style: {
              background: "#d1fae5",
              color: "#065f46",
            },
          },
          error: {
            icon: "❌",
            style: {
              background: "#fee2e2",
              color: "#991b1b",
            },
          },
        }}
      />

      <Routes>
        {/* Login */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* Dashboard Layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute adminOnly>
              <Dashboard />
            </ProtectedRoute>
          }
        >

          {/* Default Dashboard Page */}
          <Route index element={<h2>Welcome Admin</h2>} />

          {/* Category */}
          <Route path="category-master" element={<CategoryMaster />} />

          {/* Exam Master */}
          <Route path="exam-master" element={<ExamMaster />} />

          {/* Exam View */}
          <Route path="exam-view" element={<ExamView />} />

        </Route>
      </Routes>
    </Router>
  );
}

export default App;
