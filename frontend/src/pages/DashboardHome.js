import React from "react";
import { BookOpenCheck, ClipboardCheck, Sparkles, Users } from "lucide-react";
import logo from "../logo.svg";

const DashboardHome = () => {
  return (
    <div className="medha-stage rounded-[28px] p-5 md:p-8 overflow-hidden relative">
      <div className="medha-glow medha-glow-one"></div>
      <div className="medha-glow medha-glow-two"></div>

      <section className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-5 items-center">
        <div className="space-y-4 medha-fade-in-up">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 text-slate-700 text-xs border border-slate-200">
            <Sparkles size={14} className="text-amber-500" />
            MEDHASHALA SMART CAMPUS
          </p>
          <h1 className="text-3xl md:text-5xl leading-tight text-slate-900">
            Build Better
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600"> Learning Journeys</span>
          </h1>
          <p className="text-sm md:text-base text-slate-700 max-w-xl">
            A modern educational control room for exams, question banks, and subject-wise mock tests with professional workflow.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="medha-stat-card">
              <BookOpenCheck size={18} />
              <div>
                <p className="text-xl">120+</p>
                <p className="text-xs text-slate-600">Subjects Managed</p>
              </div>
            </div>
            <div className="medha-stat-card">
              <ClipboardCheck size={18} />
              <div>
                <p className="text-xl">8K+</p>
                <p className="text-xs text-slate-600">Questions Ready</p>
              </div>
            </div>
            <div className="medha-stat-card">
              <Users size={18} />
              <div>
                <p className="text-xl">3K+</p>
                <p className="text-xs text-slate-600">Active Learners</p>
              </div>
            </div>
            <div className="medha-stat-card">
              <Sparkles size={18} />
              <div>
                <p className="text-xl">99%</p>
                <p className="text-xs text-slate-600">Platform Uptime</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative medha-float-in">
          <div className="medha-hero-card">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">MEDHASHALA Intelligence</p>
              <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px]">Live</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-[11px] text-slate-500">Question Sets</p>
                <p className="text-lg">QSET 214</p>
              </div>
              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-[11px] text-slate-500">Today Attempts</p>
                <p className="text-lg">1,284</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white p-4 flex items-center gap-4">
              <img src={logo} alt="Medhashala" className="h-12 w-12 rounded-xl bg-white/70 p-1" />
              <div>
                <p className="text-xs opacity-90">MEDHASHALA STYLE</p>
                <p className="text-lg">Education Platform Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardHome;
