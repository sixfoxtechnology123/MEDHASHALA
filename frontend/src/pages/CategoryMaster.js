import React, { useState, useEffect } from "react";
import { 
  Layers, Hash, Save, CheckSquare, Square, 
  Loader2, Edit, Trash2, Search, Plus, X, RefreshCw
} from "lucide-react";
import axios from "../api/axios";
import toast from "react-hot-toast";

const CategoryMaster = () => {
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
    catName: "", 
    features: [] 
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
    setEditId(null);
    setFormData({ catId: "", examId: "", catName: "", features: [] });
    fetchData();
    setIsFormOpen(true);
  };

  const handleEdit = (cat) => {
    const matchedExam = exams.find(
      (ex) =>
        (cat.examCode && ex.examCode === cat.examCode) ||
        (cat.examName && ex.examName === cat.examName) ||
        String(cat.examId || "") === String(ex._id || "")
    );

    setEditId(cat._id);
    setFormData({
      catId: cat.catId,
      examId: matchedExam?._id || "",
      catName: cat.catName,
      features: cat.features || []
    });
    setIsFormOpen(true);
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
      const payload = { ...formData, id: editId };

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
    (c.examCode || "").toLowerCase().includes(searchTerm.toLowerCase())
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
      <h1 className="text-lg font-black text-slate-900 uppercase tracking-tighter">
        Category Master
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
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl font-black text-xs shadow-lg uppercase tracking-widest transition-all active:scale-95"
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
          className="w-full pl-14 pr-6 py-2 bg-white border-2 border-slate-100 rounded-[20px] font-black text-sm outline-none focus:border-blue-600 uppercase transition-all shadow-sm"
        />
      </div>
    </header>

      {/* --- TABLE --- */}
      <section className="bg-white rounded-[10px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-widest">
                <th className="p-2">ID</th>
                <th className="p-2">Exam</th>
                <th className="p-2">Category Name</th>
                <th className="p-2">Features</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="5" className="p-20 text-center animate-pulse font-black text-slate-300 uppercase">Loading Records...</td></tr>
              ) : filteredCategories.map(cat => (
                <tr key={cat._id} className="hover:bg-blue-50/30 transition-all">
                  <td className="p-2 font-black text-blue-600 text-sm">{cat.catId}</td>
                  <td className="p-2 font-black text-slate-900 text-[10px] uppercase">
                    {cat.examName || "---"}
                  </td>
                  <td className="p-2 font-black text-slate-800 text-sm uppercase">{cat.catName}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {cat.features.slice(0, 2).map(f => (
                        <span key={f} className="px-2 py-1 bg-slate-100 text-slate-900 rounded-md text-[9px] font-bold">{f}</span>
                      ))}
                    </div>
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
            className="relative bg-white w-full max-w-xl p-8 rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter">{editId ? "Update" : "Add"} Category</h2>
             
              </div>
              <button type="button" onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-900 mb-1 block">Category ID</label>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-blue-600 text-sm">
                    {formData.catId || "..."}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-900 mb-1 block">Parent Exam</label>
                  <select 
                    required
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-xs outline-none focus:border-blue-600 uppercase"
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
                <label className="text-[9px] font-black uppercase text-slate-900 mb-1 block">Category Name</label>
                <input 
                  required
                  type="text"
                  className="w-full p-3 border border-slate-200 rounded-xl font-black text-xs outline-none focus:border-blue-600 uppercase"
                  value={formData.catName}
                  onChange={(e) => setFormData({...formData, catName: e.target.value.toUpperCase()})}
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-900 mb-3 block">Features</label>
                <div className="flex flex-wrap gap-2">
                  {featureOptions.map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFeature(f)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all font-black text-[9px] ${
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

              <button 
                disabled={isSaving}
                className="w-full py-4 mt-2 bg-[#0F172A] text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all flex justify-center items-center gap-3 active:scale-[0.98]"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
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
