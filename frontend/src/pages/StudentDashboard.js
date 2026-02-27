import React from "react";
import { BookOpenCheck, BrainCircuit, ChartNoAxesCombined, Trophy } from "lucide-react";
import logo from "../logo.svg";

const StudentDashboard = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e0f2fe,_#f8fafc_40%,_#eef2ff_75%)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="rounded-[28px] p-6 md:p-8 bg-white/80 border border-white shadow-[0_18px_45px_rgba(15,23,42,0.14)] relative overflow-hidden">
          <div className="medha-glow medha-glow-one"></div>
          <div className="medha-glow medha-glow-two"></div>
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div className="medha-fade-in-up">
              <p className="inline-flex px-3 py-1 rounded-full text-xs bg-sky-100 text-sky-700 border border-sky-200">
                Student Panel - MEDHASHALA
              </p>
              <h1 className="mt-3 text-3xl md:text-5xl leading-tight text-slate-900">
                Learn Smart,
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600"> Crack Fast</span>
              </h1>
              <p className="mt-3 text-sm text-slate-700">
                Welcome to your learning command center. Practice subject-wise mock tests, track performance, and improve with explanations.
              </p>
            </div>

            <div className="medha-float-in">
              <div className="medha-hero-card">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="Medhashala" className="h-14 w-14 rounded-xl bg-white p-1 shadow" />
                  <div>
                    <p className="text-xs text-slate-500">Education Platform</p>
                    <p className="text-xl text-slate-900">MEDHASHALA</p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 p-4 text-white">
                  <p className="text-xs opacity-90">Daily Motivation</p>
                  <p className="text-lg">Practice + Analysis = Rank Boost</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="medha-stat-card"><BookOpenCheck size={20} /><div><p className="text-xl">Daily Mock</p><p className="text-xs text-slate-600">Subject-wise practice tests</p></div></div>
          <div className="medha-stat-card"><BrainCircuit size={20} /><div><p className="text-xl">Smart Review</p><p className="text-xs text-slate-600">See explanations quickly</p></div></div>
          <div className="medha-stat-card"><ChartNoAxesCombined size={20} /><div><p className="text-xl">Performance</p><p className="text-xs text-slate-600">Track marks and accuracy</p></div></div>
          <div className="medha-stat-card"><Trophy size={20} /><div><p className="text-xl">Goal Focus</p><p className="text-xs text-slate-600">Stay exam-ready daily</p></div></div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
