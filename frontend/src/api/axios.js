import axios from "axios";

const baseURL = process.env.REACT_APP_API_URL || "http://localhost:5004/api";

const API = axios.create({
  baseURL,
});

// =========================
// Request Interceptor
// =========================
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");

  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  return req;
});

// =========================
// EXAM APIs
// =========================

// Get all exams
export const getAllExams = () => {
  return API.get("/exams");
};

// Get latest exam
export const getLatestExam = () => {
  return API.get("/exams/latest");
};

// Create or Update exam
export const upsertExam = (data) => {
  if (data?.id) {
    const { id, ...payload } = data;
    return API.put(`/exams/${id}`, payload);
  }
  return API.post("/exams", data);
};

// Delete exam
export const deleteExam = (id) => {
  return API.delete(`/exams/${id}`);
};

// =========================
// Default Export
// =========================
export default API;
