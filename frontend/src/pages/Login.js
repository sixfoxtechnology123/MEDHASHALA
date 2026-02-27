import { useState, useContext } from "react";
import API from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Login = () => {
  const [form, setForm] = useState({ userid: "", password: "" });
  const [error, setError] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await API.post("/auth/login", form);
      login(data);
      if (String(data?.user?.role || "").toLowerCase() === "admin") {
        navigate("/dashboard");
      } else {
        navigate("/student");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Login failed");
      } else {
        setError("Login failed");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-indigo-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow w-96 space-y-4">
        <h2 className="text-xl font-bold text-center">Login</h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <input type="text" placeholder="User ID"
          className="w-full border p-2 rounded"
          onChange={(e)=>setForm({...form,userid:e.target.value})}
        />
        <input type="password" placeholder="Password"
          className="w-full border p-2 rounded"
          onChange={(e)=>setForm({...form,password:e.target.value})}
        />
        <button className="w-full bg-indigo-600 text-white p-2 rounded">
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;
