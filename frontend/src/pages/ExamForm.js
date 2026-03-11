import React, { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { getAllExams, getLatestExam, upsertExam } from "../api/axios";

const ExamForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    examCode: "",
    examName: "",
    status: "ACTIVE",
  });

  const loadNew = async () => {
    setLoading(true);
    try {
      const res = await getLatestExam();
      setFormData({
        examCode: res?.data?.nextId || "",
        examName: "",
        status: "ACTIVE",
      });
    } catch {
      toast.error("ERROR GENERATING NEXT ID");
    } finally {
      setLoading(false);
    }
  };

  const loadEdit = async (examId) => {
    setLoading(true);
    try {
      const res = await getAllExams();
      const rows = res?.data || [];
      const row = rows.find((r) => String(r._id) === String(examId));
      if (!row) {
        toast.error("EXAM NOT FOUND");
        navigate("/dashboard/exam-master");
        return;
      }
      setFormData({
        examCode: row.examCode || "",
        examName: row.examName || "",
        status: row.status || "ACTIVE",
      });
    } catch {
      toast.error("FAILED TO LOAD EXAM");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEdit) {
      loadEdit(id);
    } else {
      loadNew();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.examName.trim()) return toast.error("EXAM NAME IS REQUIRED");

    setIsSaving(true);
    try {
      const payload = {
        examCode: formData.examCode,
        examName: formData.examName.toUpperCase(),
        status: (formData.status || "ACTIVE").toUpperCase(),
      };
      if (isEdit) payload.id = id;

      const res = await upsertExam(payload);
      if (res.data.success || (res.status >= 200 && res.status < 300)) {
        toast.success(isEdit ? "RECORD UPDATED" : "RECORD SAVED");
        navigate("/dashboard/exam-master");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "SAVE FAILED - CHECK SERVER");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F7FF]">
      <header className="p-2 space-y-2">
        <div className="bg-white px-4 py-3 rounded-[24px] border border-slate-200 shadow-sm flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{isEdit ? "Update Exam" : "New Exam"}</h1>
            <p className="text-xs text-slate-500">ID: <span className="font-semibold text-blue-700">{formData.examCode || "--"}</span></p>
          </div>
          <button type="button" onClick={() => navigate("/dashboard/exam-master")} className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-700">Back</button>
        </div>
      </header>

      <section className="px-3 pb-6">
        <form onSubmit={handleSubmit} className="bg-white w-full max-w-2xl p-6 rounded-[24px] border border-slate-200 shadow-sm">
          <div className="space-y-6">
            <div>
              <label className="text-sm font-semibold block mb-2">ID Code</label>
              <input
                type="text"
                value={formData.examCode}
                readOnly
                className="w-full py-2 bg-slate-50 border border-slate-200 font-semibold text-sm text-blue-600 px-4 rounded-xl"
              />
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">Exam Name</label>
              <input
                autoFocus
                type="text"
                value={formData.examName}
                onChange={(e) => setFormData({ ...formData, examName: e.target.value.toUpperCase() })}
                className="w-full py-2 border border-slate-200 rounded-xl font-semibold text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full py-2 border border-slate-200 rounded-xl font-semibold text-sm outline-none focus:border-blue-600 bg-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <button
              disabled={isSaving || loading}
              className="w-full py-2 bg-[#0F172A] hover:bg-blue-600 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : <Save size={15} />}
              {isEdit ? "UPDATE RECORD" : "SAVE RECORD"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default ExamForm;
