import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";   // ✅ Added

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DashboardHome from "./pages/DashboardHome";
import CategoryMaster from "./pages/CategoryMaster";
import ExamMaster from "./pages/ExamMaster";
import ExamForm from "./pages/ExamForm";
import ExamView from "./pages/ExamView";
import SyllabusMaster from "./pages/SyllabusMaster";
import SyllabusForm from "./pages/SyllabusForm";
import SyllabusView from "./pages/SyllabusView";
import CategoryForm from "./pages/CategoryForm";
import MockTest from "./pages/MockTest";
import MockTestAttempt from "./pages/MockTestAttempt";
import QuestionBank from "./pages/QuestionBank";
import QuestionBankForm from "./pages/QuestionBankForm";
import StudentDashboard from "./pages/StudentDashboard";
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
          <Route index element={<DashboardHome />} />

          {/* Category */}
          <Route path="category-master" element={<CategoryMaster />} />
          <Route path="category-master/new" element={<CategoryForm />} />
          <Route path="category-master/:id/edit" element={<CategoryForm />} />

          {/* Exam Master */}
          <Route path="exam-master" element={<ExamMaster />} />
          <Route path="exam-master/new" element={<ExamForm />} />
          <Route path="exam-master/:id/edit" element={<ExamForm />} />

          {/* Exam View */}
          <Route path="exam-view" element={<ExamView />} />

          {/* Syllabus Master */}
          <Route path="syllabus-master" element={<SyllabusMaster />} />
          <Route path="syllabus-master/new" element={<SyllabusForm />} />
          <Route path="syllabus-master/:id/edit" element={<SyllabusForm />} />
          <Route path="syllabus-view/:syllabusId" element={<SyllabusView />} />
          <Route path="question-bank" element={<QuestionBank />} />
          <Route path="question-bank/new" element={<QuestionBankForm />} />
          <Route path="question-bank/:id/edit" element={<QuestionBankForm />} />
          <Route path="mock-test" element={<MockTest />} />
          <Route path="mock-test-attempt/:subjectId" element={<MockTestAttempt />} />

        </Route>

        <Route
          path="/student"
          element={
            <ProtectedRoute>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
