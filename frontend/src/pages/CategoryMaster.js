import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layers, Hash, Save, CheckSquare, Square,
  Loader2, Edit, Trash2, Search, Plus, X, RefreshCw
} from "lucide-react";
import axios from "../api/axios";
import toast from "react-hot-toast";

const CategoryMaster = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [exRes, catRes, idRes] = await Promise.allSettled([
        axios.get("/master/exam"),
        axios.get("/master/category/all"),
        axios.get("/master/category/next-id")
      ]);

      if (exRes.status === "fulfilled") {
        const examList = Array.isArray(exRes.value.data) ? exRes.value.data : exRes.value.data?.data || [];
        setExams(examList);
      }
      if (catRes.status === "fulfilled") {
        const categoryList = Array.isArray(catRes.value.data) ? catRes.value.data : catRes.value.data?.data || [];
        setCategories(categoryList);
      }
      if (idRes.status === "fulfilled" && idRes.value.data?.nextId && !editId) {
        setFormData((prev) => ({ ...prev, catId: idRes.value.data.nextId }));
      }
    } catch (err) {
      toast.error("DATABASE SYNC FAILED");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleFeature = (feature) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const openAddForm = () => {
    navigate("/dashboard/category-master/new");
  };

  const handleEdit = (cat) => {
    navigate(`/dashboard/category-master/${cat._id}/edit`);
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
    if (!formData.examId) {
      toast.error("PLEASE SELECT EXAM");
      return;
    }
    if (!formData.catName?.trim()) {
      toast.error("PLEASE ENTER CATEGORY NAME");
      return;
    }

    setIsSaving(true);
    try {
      const payload = { ...formData, id: editId, examStages: formData.examStages.filter(Boolean) };

      const res = await axios.post("/master/category/upsert", payload);
      if (res.data.success) {
        toast.success(editId ? "UPDATED" : "SAVED");
        setIsFormOpen(false);
        fetchData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "SAVE FAILED");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("ARE YOU SURE?")) return;
    try {
      await axios.delete(`/master/category/${id}`);
      toast.success("DELETED");
      fetchData();
    } catch (err) { toast.error("DELETE FAILED"); }
  };

  const filteredCategories = categories.filter(c => 
    c.catName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.examName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.examCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (Array.isArray(c.examStages) ? c.examStages.join(" ") : c.examStage || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.status || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
  <div className="flex flex-col h-full min-w-0 font-sans relative bg-[#F0F7FF] min-h-screen">
      
  <header className="p-2 md:p-2 space-y-2">
  {/* TOP BAR */}
  <div className="bg-white px-4 py-2 rounded-[24px] border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
    <div className="flex items-center gap-4">
      <div className="p-2 bg-[#0F172A] rounded-2xl text-white shadow-xl">
        <Layers size={14} />
      </div>
      <h1 className="text-lg font-bold text-slate-900 uppercase tracking-tighter">
        Category 
      </h1>
    </div>

    <div className="flex items-center gap-3">
      {/* REFRESH BUTTON */}
      <button
        onClick={fetchData}
        className="p-2 bg-slate-50 text-slate-900 rounded-2xl border border-slate-100 transition-colors hover:bg-slate-100"
      >
        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
      </button>

      {/* ADD NEW BUTTON */}
      <button
        onClick={openAddForm}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl font-bold text-xs shadow-lg uppercase tracking-widest transition-all active:scale-95"
      >
        <Plus size={14} strokeWidth={3} />
        Add New
      </button>
    </div>
  </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search
          className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-900"
          size={20}
        />
        <input
          type="text"
          placeholder="SEARCH RECORDS..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-6 py-2 bg-white border-2 border-slate-100 rounded-[20px] font-bold text-sm outline-none focus:border-blue-600 uppercase transition-all shadow-sm"
        />
      </div>
    </header>

      {/* --- TABLE --- */}
      <section className="bg-white rounded-[10px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#0F172A] text-white text-[11px] font-bold uppercase tracking-widest">
                <th className="p-2">ID</th>
                <th className="p-2">Exam</th>
                <th className="p-2">Category Name</th>
                 <th className="p-2">Exam Stage</th>
                <th className="p-2">Features</th>
                <th className="p-2">Status</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="7" className="p-20 text-center animate-pulse font-bold text-slate-300 uppercase">Loading Records...</td></tr>
              ) : filteredCategories.map(cat => (
                <tr key={cat._id} className="hover:bg-blue-50/30 transition-all">
                  <td className="p-2 font-bold text-blue-600 text-[12px]">{cat.catId}</td>
                  <td className="p-2 font-bold text-slate-900 text-[11px] uppercase">
                    {cat.examName || "---"}
                  </td>
                 
                  <td className="p-2 font-bold text-slate-800 text-[11px] uppercase">{cat.catName}</td>
                   <td className="p-2 text-[11px] font-semibold text-slate-700">
                    {(Array.isArray(cat.examStages) ? cat.examStages : [cat.examStage]).filter(Boolean).join(", ") || "---"}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {cat.features.slice(0, 2).map(f => (
                        <span key={f} className="px-2 py-1 bg-slate-100 text-slate-900 rounded-md text-[9px] font-bold">{f}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase ${
                        cat.status === "INACTIVE"
                          ? "bg-red-100 text-red-600"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {cat.status || "ACTIVE"}
                    </span>
                  </td>
                  <td className="p-2 flex justify-center gap-2">
                    <button onClick={() => handleEdit(cat)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(cat._id)} className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- NO-SCROLL MODAL --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsFormOpen(false)}></div>
          
          <form 
            onSubmit={handleSubmit}
            className="relative bg-white w-full max-w-xl p-8 rounded-[40px] shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-tighter">{editId ? "Update" : "Add"} Category</h2>
             
              </div>
              <button type="button" onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-900 mb-1 block">Category ID</label>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-blue-600 text-[11px]">
                    {formData.catId || "..."}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-900 mb-1 block">Parent Exam</label>
                  <select 
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-semibold text-[11px] outline-none focus:border-blue-600"
                    value={formData.examId}
                    onChange={(e) => setFormData({...formData, examId: e.target.value})}
                  >
                    <option value="">-- SELECT --</option>
                    {exams.map((ex) => (
                      <option key={ex._id} value={ex._id}>
                        { ex.examName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

       

              <div>
                <label className="text-sm font-semibold text-slate-900 mb-1 block">Category Name</label>
                <input 
                  type="text"
                  className="w-full p-3 border border-slate-200 rounded-xl font-semibold text-[11px] outline-none focus:border-blue-600"
                  value={formData.catName}
                  onChange={(e) => setFormData({...formData, catName: e.target.value.toUpperCase()})}
                />
              </div>
                <div>
                <label className="text-sm font-semibold text-slate-900 mb-1 block">
                  Exam Stage (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. PRE, MAINS, PHASE-1"
                    className="w-full p-3 border border-slate-200 rounded-xl font-semibold text-[11px] outline-none focus:border-blue-600"
                    value={formData.examStageInput}
                    onChange={(e) => setFormData({ ...formData, examStageInput: e.target.value.toUpperCase() })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addExamStage();
                      }
                    }}
                  />
                  <button type="button" onClick={addExamStage} className="p-3 rounded-xl bg-slate-900 text-white hover:bg-blue-600">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {(formData.examStages || []).map((stage, idx) => (
                    <div key={`stage-${idx}`} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={stage}
                        onChange={(e) => updateExamStage(idx, e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-[11px] outline-none focus:border-blue-600"
                      />
                      <button type="button" onClick={() => removeExamStage(idx)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-900 mb-3 block">Features</label>
                <div className="flex flex-wrap gap-2">
                  {featureOptions.map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFeature(f)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all font-semibold text-[11px] ${
                        formData.features.includes(f) 
                        ? "bg-blue-600 border-blue-600 text-white shadow-md" 
                        : "bg-white border-slate-200 text-slate-900"
                      }`}
                    >
                      {formData.features.includes(f) ? <CheckSquare size={12} /> : <Square size={12} />}
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-900 mb-1 block">Status</label>
                <select
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-semibold text-[11px] outline-none focus:border-blue-600"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <button 
                disabled={isSaving}
                className="w-full py-2 mt-2 bg-[#0F172A] text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all flex justify-center items-center gap-3 active:scale-[0.98]"
              >
                {isSaving ? <Loader2 className="animate-spin" size={15} /> : <Save size={18} />}
                {editId ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CategoryMaster;
