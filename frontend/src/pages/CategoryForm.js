import React, { useEffect, useMemo, useState } from "react";
import { Edit, Loader2, Save, Trash2, X, Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../api/axios";
import toast from "react-hot-toast";

const CategoryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    catId: "",
    examId: "",
    examStages: [],
    examStageInput: "",
    catName: "",
    features: [],
    status: "ACTIVE",
  });

  const featureOptions = ["SYLLABUS", "MOCK TEST", "PYQ", "STUDY MATERIAL", "VIDEOS"];

  const fetchBase = async () => {
    setLoading(true);
    try {
      const [exRes, catRes, idRes] = await Promise.allSettled([
        axios.get("/master/exam"),
        axios.get("/master/category/all"),
        axios.get("/master/category/next-id"),
      ]);

      const examList = exRes.status === "fulfilled"
        ? (Array.isArray(exRes.value.data) ? exRes.value.data : exRes.value.data?.data || [])
        : [];
      const categoryList = catRes.status === "fulfilled"
        ? (Array.isArray(catRes.value.data) ? catRes.value.data : catRes.value.data?.data || [])
        : [];

      setExams(examList);
      setCategories(categoryList);

      if (!isEdit && idRes.status === "fulfilled" && idRes.value.data?.nextId) {
        setFormData((prev) => ({ ...prev, catId: idRes.value.data.nextId }));
      }

      if (isEdit) {
        const row = categoryList.find((c) => String(c._id) === String(id));
        if (!row) {
          toast.error("CATEGORY NOT FOUND");
          navigate("/dashboard/category-master");
          return;
        }
        const matchedExam = examList.find(
          (ex) =>
            (row.examCode && ex.examCode === row.examCode) ||
            (row.examName && ex.examName === row.examName) ||
            String(row.examId || "") === String(ex._id || "")
        );
        const stages = Array.from(
          new Set(
            [ ...(Array.isArray(row.examStages) ? row.examStages : []), row.examStage ]
              .map((s) => String(s || "").trim().toUpperCase())
              .filter(Boolean)
          )
        );
        setFormData({
          catId: row.catId || "",
          examId: matchedExam?._id || "",
          examStages: stages,
          examStageInput: "",
          catName: row.catName || "",
          features: row.features || [],
          status: row.status || "ACTIVE",
        });
      }
    } catch {
      toast.error("DATABASE SYNC FAILED");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleFeature = (feature) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const addExamStage = () => {
    const value = String(formData.examStageInput || "").trim().toUpperCase();
    if (!value) return;
    setFormData((prev) => ({
      ...prev,
      examStages: prev.examStages.includes(value) ? prev.examStages : [...prev.examStages, value],
      examStageInput: "",
    }));
  };

  const updateExamStage = (idx, value) => {
    const clean = String(value || "").toUpperCase();
    setFormData((prev) => ({
      ...prev,
      examStages: prev.examStages.map((s, i) => (i === idx ? clean : s)),
    }));
  };

  const removeExamStage = (idx) => {
    setFormData((prev) => ({
      ...prev,
      examStages: prev.examStages.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.examId) return toast.error("PLEASE SELECT EXAM");
    if (!formData.catName?.trim()) return toast.error("PLEASE ENTER CATEGORY NAME");

    setIsSaving(true);
    try {
      const payload = { ...formData, id: isEdit ? id : undefined, examStages: formData.examStages.filter(Boolean) };
      const res = await axios.post("/master/category/upsert", payload);
      if (res.data.success) {
        toast.success(isEdit ? "UPDATED" : "SAVED");
        navigate("/dashboard/category-master");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "SAVE FAILED");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F7FF]">
      <header className="p-2 space-y-2">
        <div className="bg-white px-4 py-3 rounded-[24px] border border-slate-200 shadow-sm flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{isEdit ? "Update Category" : "New Category"}</h1>
            <p className="text-xs text-slate-500">ID: <span className="font-semibold text-blue-700">{formData.catId || "--"}</span></p>
          </div>
          <button type="button" onClick={() => navigate("/dashboard/category-master")} className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-700">Back</button>
        </div>
      </header>

      <section className="px-3 pb-6">
        <form onSubmit={handleSubmit} className="bg-white w-full p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold block mb-1">Category ID</label>
              <input value={formData.catId} readOnly className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 text-blue-600" />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">Status</label>
              <select value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold">
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">Exam</label>
              <select value={formData.examId} onChange={(e) => setFormData((p) => ({ ...p, examId: e.target.value }))} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold">
                <option value="">-- Select Exam --</option>
                {exams.map((ex) => <option key={ex._id} value={ex._id}>{ex.examName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">Category Name</label>
              <input value={formData.catName} onChange={(e) => setFormData((p) => ({ ...p, catName: e.target.value.toUpperCase() }))} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-3 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase text-slate-700">Exam Stages</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={formData.examStageInput}
                onChange={(e) => setFormData((p) => ({ ...p, examStageInput: e.target.value.toUpperCase() }))}
                placeholder="Add stage"
                className="flex-1 p-2 border border-slate-200 rounded-xl text-sm font-semibold"
              />
              <button type="button" onClick={addExamStage} className="p-2 bg-blue-600 text-white rounded-xl"><Plus size={14} /></button>
            </div>
            <div className="space-y-2">
              {formData.examStages.map((stage, idx) => (
                <div key={`${stage}-${idx}`} className="flex items-center gap-2">
                  <input value={stage} onChange={(e) => updateExamStage(idx, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded-xl text-sm font-semibold" />
                  <button type="button" onClick={() => removeExamStage(idx)} className="p-2 bg-red-50 text-red-500 rounded-xl"><X size={14} /></button>
                </div>
              ))}
              {formData.examStages.length === 0 && <p className="text-xs text-slate-400">No stages added.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-3 bg-white space-y-2">
            <label className="text-xs font-bold uppercase text-slate-700">Features</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {featureOptions.map((feature) => (
                <label key={feature} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={formData.features.includes(feature)} onChange={() => toggleFeature(feature)} />
                  <span>{feature}</span>
                </label>
              ))}
            </div>
          </div>

          <button disabled={isSaving || loading} className="w-full py-2 bg-[#0F172A] text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all flex justify-center items-center gap-3">
            {isSaving ? <Loader2 className="animate-spin" size={15} /> : <Save size={18} />}
            {isEdit ? "Update" : "Save"}
          </button>
        </form>
      </section>
    </div>
  );
};

export default CategoryForm;
