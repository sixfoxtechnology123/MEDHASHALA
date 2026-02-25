import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../component/Sidebar";

const Dashboard = () => {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f1f5f9" }}>
      <Sidebar />

      <div style={{
        flex: 1,
        marginLeft: "256px",
        padding: "20px",
        background: "#f1f5f9",
        minHeight: "100vh"
      }}>
        <h1>Dashboard</h1>
        <Outlet />
      </div>
    </div>
  );
};

export default Dashboard;
