import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  Trash2,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  X,
  Hash,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getAllExams,
  getLatestExam,
  upsertExam,
  deleteExam,
} from "../api/axios";

const ExamMaster = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    examCode: "",
    examName: "",
    status: "ACTIVE",
  });

  // FETCH ALL
  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await getAllExams();
      setExams(res.data || []);
    } catch {
      toast.error("FAILED TO LOAD DATABASE");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // ADD NEW
  const handleAddNew = async () => {
    setEditId(null);
    try {
      const res = await getLatestExam();
      setFormData({
        examCode: res?.data?.nextId || "",
        examName: "",
        status: "ACTIVE",
      });
      setIsModalOpen(true);
    } catch {
      toast.error("ERROR GENERATING NEXT ID");
    }
  };

  // EDIT
  const handleEdit = (item) => {
    setEditId(item._id);
    setFormData({
      examCode: item.examCode,
      examName: item.examName,
      status: item.status || "ACTIVE",
    });
    setIsModalOpen(true);
  };

// SAVE / UPDATE
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.examName.trim()) return toast.error("EXAM NAME IS REQUIRED");
    
    setIsSaving(true);
    try {
      // Logic: If editId exists, we send it as part of the object.
      // Ensure your backend 'upsertExam' controller looks for 'id' or '_id'.
      const payload = {
        examCode: formData.examCode,
        examName: formData.examName.toUpperCase(),
        status: (formData.status || "ACTIVE").toUpperCase(),
      };

      if (editId) {
        payload.id = editId; // or payload._id = editId based on your backend
      }

      const res = await upsertExam(payload);

      // Check for res.data.success if that's how your backend responds
      if (res.data.success || (res.status >= 200 && res.status < 300)) {
        toast.success(editId ? "RECORD UPDATED" : "RECORD SAVED");
        setIsModalOpen(false);
        setFormData({ examCode: "", examName: "", status: "ACTIVE" }); // Reset form
        fetchExams();
      }
    } catch (err) {
      console.error("Save Error:", err);
      toast.error(err?.response?.data?.message || "SAVE FAILED - CHECK SERVER");
    } finally {
      setIsSaving(false);
    }
  };

  // DELETE
  const handleDelete = async (id) => {
    if (window.confirm("ARE YOU SURE YOU WANT TO DELETE THIS?")) {
      try {
        await deleteExam(id);
        toast.success("DELETED SUCCESSFULLY");
        fetchExams();
      } catch {
        toast.error("DELETE FAILED");
      }
    }
  };

  const filteredData = exams.filter(
    (item) =>
      item.examName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.examCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.status || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full min-w-0 font-sans relative">
      {/* HEADER */}
      <header className="p-2 md:p-2 space-y-2">
        <div className="bg-white px-4 py-2 rounded-[24px] border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-[#0F172A] rounded-2xl text-white shadow-xl">
              <BookOpen size={14} />
            </div>
            <h1 className="text-lg font-bold text-slate-900 uppercase tracking-tighter">
              Exam
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchExams}
              className="p-2 bg-slate-50 text-slate-400 rounded-2xl border border-slate-100"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl font-bold text-xs shadow-lg uppercase tracking-widest"
            >
              <Plus size={14} strokeWidth={3} />
              Add New
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="SEARCH RECORDS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-2 bg-white border-2 border-slate-100 rounded-[20px] font-bold text-sm outline-none focus:border-blue-600 uppercase"
          />
        </div>
      </header>

      {/* --- TABLE --- */}
      <section className="bg-white rounded-[10px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#0F172A] text-white">
                <th className="p-2 text-[10px] font-bold uppercase">ID</th>
                <th className="p-2 text-[10px] font-bold uppercase">Exam Name</th>
                <th className="p-2 text-[10px] font-bold uppercase">Status</th>
                <th className="p-2 text-[10px] font-bold uppercase text-center">
                  Manage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-20 text-center font-bold text-slate-400 uppercase">
                    Syncing Database...
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item._id} className="hover:bg-blue-50/30">
                    <td className="p-2 font-bold text-blue-600 text-xs">
                      {item.examCode}
                    </td>
                    <td className="p-2 font-bold text-slate-800 text-xs uppercase">
                      {item.examName}
                    </td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase ${
                          item.status === "INACTIVE"
                            ? "bg-red-100 text-red-600"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {item.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="p-2 flex justify-center gap-3">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-20 text-center font-bold text-slate-300 uppercase text-xl">
                    No Records Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>

          <form
            onSubmit={handleSubmit}
            className="relative bg-white w-full max-w-xl p-10 rounded-[40px] shadow-2xl"
          >
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-bold uppercase">
                {editId ? "Update Exam" : "New Exam"}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-8">
              <div>
                <label className="text-sm font-semibold flex items-center gap-2">
                  ID Code
                </label>
                <input
                  type="text"
                  value={formData.examCode}
                  readOnly
                  className="w-full py-2 bg-slate-50 border-b-2 font-semibold text-sm text-blue-600 px-4 rounded-xl"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Exam Name
                </label>
                <input
                  autoFocus
                  type="text"
                  value={formData.examName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      examName: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full py-2 border-b-2 font-semibold text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value,
                    })
                  }
                  className="w-full py-2 border-b-2 font-semibold text-sm outline-none focus:border-blue-600 bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <button
                disabled={isSaving}
                className="w-full py-2 bg-[#0F172A] hover:bg-blue-600 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={15} />}
                {editId ? "UPDATE RECORD" : "SAVE RECORD"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ExamMaster;
