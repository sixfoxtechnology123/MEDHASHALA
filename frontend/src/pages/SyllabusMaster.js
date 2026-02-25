import React, { useEffect, useMemo, useState } from "react";
import {
  BookCopy,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
  PlusCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "../api/axios";

const emptyTopic = { topicName: "", subTopicInput: "", subTopics: [] };

const SyllabusMaster = () => {
  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [syllabusRows, setSyllabusRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    syllabusId: "",
    examId: "",
    categoryId: "",
    subjectName: "",
    status: "ACTIVE",
    topics: [],
  });
  const [currentTopic, setCurrentTopic] = useState({ ...emptyTopic });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [examRes, catRes, sylRes, idRes] = await Promise.allSettled([
        axios.get("/master/exam"),
        axios.get("/master/category/all"),
        axios.get("/master/syllabus/all"),
        axios.get("/master/syllabus/next-id"),
      ]);

      if (examRes.status === "fulfilled") {
        const examList = Array.isArray(examRes.value.data)
          ? examRes.value.data
          : examRes.value.data?.data || [];
        setExams(examList);
      }

      if (catRes.status === "fulfilled") {
        const catList = Array.isArray(catRes.value.data)
          ? catRes.value.data
          : catRes.value.data?.data || [];
        setCategories(catList);
      }

      if (sylRes.status === "fulfilled") {
        const syllabusList = Array.isArray(sylRes.value.data)
          ? sylRes.value.data
          : sylRes.value.data?.data || [];
        setSyllabusRows(syllabusList);
      }

      if (idRes.status === "fulfilled" && idRes.value.data?.nextId && !editId) {
        setFormData((prev) => ({ ...prev, syllabusId: idRes.value.data.nextId }));
      }
    } catch {
      toast.error("DATABASE SYNC FAILED");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRows = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return syllabusRows.filter(
      (row) =>
        (row.syllabusId || "").toLowerCase().includes(q) ||
        (row.examName || "").toLowerCase().includes(q) ||
        (row.catName || "").toLowerCase().includes(q) ||
        (row.subjectName || "").toLowerCase().includes(q) ||
        (row.status || "").toLowerCase().includes(q)
    );
  }, [searchTerm, syllabusRows]);

  const filteredCategories = useMemo(() => {
    const selectedExam = exams.find((ex) => String(ex._id) === String(formData.examId));
    if (!selectedExam) return [];
    return categories.filter(
      (cat) =>
        String(cat.examCode || "").toUpperCase() === String(selectedExam.examCode || "").toUpperCase()
    );
  }, [categories, exams, formData.examId]);

  const openAddModal = async () => {
    setEditId(null);
    try {
      const idRes = await axios.get("/master/syllabus/next-id");
      setFormData({
        syllabusId: idRes.data?.nextId || "",
        examId: "",
        categoryId: "",
        subjectName: "",
        status: "ACTIVE",
        topics: [],
      });
      setCurrentTopic({ ...emptyTopic });
      setIsModalOpen(true);
    } catch {
      toast.error("ID GENERATION FAILED");
    }
  };

  const handleEdit = (row) => {
    const exam = exams.find(
      (ex) =>
        String(ex._id) === String(row.examId) ||
        String(ex.examCode || "").toUpperCase() === String(row.examCode || "").toUpperCase()
    );

    const cat = categories.find(
      (c) =>
        String(c._id) === String(row.categoryId) ||
        (String(c.catId || "").toUpperCase() === String(row.catId || "").toUpperCase() &&
          String(c.examCode || "").toUpperCase() === String(row.examCode || "").toUpperCase())
    );

    setEditId(row._id);
    setFormData({
      syllabusId: row.syllabusId,
      examId: exam?._id || "",
      categoryId: cat?._id || "",
      subjectName: row.subjectName || "",
      status: row.status || "ACTIVE",
      topics: (row.topics || []).map((t) => ({
        topicName: t.topicName || "",
        subTopics: t.subTopics || [],
      })),
    });
    setCurrentTopic({ ...emptyTopic });
    setIsModalOpen(true);
  };

  const addSubTopicToCurrent = () => {
    const value = String(currentTopic?.subTopicInput || "").trim().toUpperCase();
    if (!value) return;
    setCurrentTopic((prev) => ({
      ...prev,
      subTopics: [...(prev.subTopics || []), value],
      subTopicInput: "",
    }));
  };

  const removeCurrentSubTopic = (subIndex) => {
    setCurrentTopic((prev) => ({
      ...prev,
      subTopics: prev.subTopics.filter((_, sIdx) => sIdx !== subIndex),
    }));
  };

  const saveTopicDraft = () => {
    const topicName = String(currentTopic.topicName || "").trim().toUpperCase();
    const pendingSub = String(currentTopic.subTopicInput || "").trim().toUpperCase();
    const subTopics = [...(currentTopic.subTopics || []), ...(pendingSub ? [pendingSub] : [])].filter(Boolean);
    if (!topicName) {
      toast.error("PLEASE ENTER TOPIC NAME");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      topics: [...prev.topics, { topicName, subTopics }],
    }));
    setCurrentTopic({ ...emptyTopic });
    toast.success("TOPIC SAVED");
  };

  const removeSavedTopic = (idx) => {
    setFormData((prev) => ({
      ...prev,
      topics: prev.topics.filter((_, i) => i !== idx),
    }));
  };

  const editSavedTopic = (idx) => {
    const topic = formData.topics[idx];
    if (!topic) return;
    setCurrentTopic({
      topicName: topic.topicName || "",
      subTopicInput: "",
      subTopics: [...(topic.subTopics || [])],
    });
    setFormData((prev) => ({
      ...prev,
      topics: prev.topics.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.examId) return toast.error("PLEASE SELECT EXAM");
    if (!formData.categoryId) return toast.error("PLEASE SELECT CATEGORY");
    if (!formData.subjectName.trim()) return toast.error("PLEASE ENTER SUBJECT NAME");

    if (formData.topics.length === 0) return toast.error("PLEASE SAVE AT LEAST ONE TOPIC");

    setIsSaving(true);
    try {
      const payload = {
        id: editId,
        syllabusId: formData.syllabusId,
        examId: formData.examId,
        categoryId: formData.categoryId,
        subjectName: formData.subjectName.toUpperCase(),
        topics: formData.topics,
        status: formData.status,
      };
      const res = await axios.post("/master/syllabus/upsert", payload);
      if (res.data.success) {
        toast.success(editId ? "UPDATED" : "SAVED");
        setIsModalOpen(false);
        setEditId(null);
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
      await axios.delete(`/master/syllabus/${id}`);
      toast.success("DELETED");
      fetchData();
    } catch {
      toast.error("DELETE FAILED");
    }
  };

  return (
    <div className="flex flex-col h-full min-w-0 font-sans relative bg-[#F0F7FF] min-h-screen">
      <header className="p-2 md:p-2 space-y-2">
        <div className="bg-white px-4 py-2 rounded-[24px] border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-[#0F172A] rounded-2xl text-white shadow-xl">
              <BookCopy size={14} />
            </div>
            <h1 className="text-lg font-black text-slate-900 uppercase tracking-tighter">
              Syllabus Master
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 bg-slate-50 text-slate-900 rounded-2xl border border-slate-100 transition-colors hover:bg-slate-100"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl font-black text-xs shadow-lg uppercase tracking-widest transition-all active:scale-95"
            >
              <Plus size={14} strokeWidth={3} />
              Add New
            </button>
          </div>
        </div>

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

      <section className="bg-white rounded-[10px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-widest">
                <th className="p-2">ID</th>
                <th className="p-2">Exam</th>
                <th className="p-2">Category</th>
                <th className="p-2">Subject</th>
                <th className="p-2">Topics</th>
                <th className="p-2">Status</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-20 text-center animate-pulse font-black text-slate-300 uppercase">
                    Loading Records...
                  </td>
                </tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <tr key={row._id} className="hover:bg-blue-50/30 transition-all align-top">
                    <td className="p-2 font-black text-blue-600 text-sm">{row.syllabusId}</td>
                    <td className="p-2 font-black text-slate-900 text-sm uppercase">{row.examName}</td>
                    <td className="p-2 font-black text-slate-800 text-sm uppercase">{row.catName}</td>
                    <td className="p-2 font-black text-slate-800 text-sm uppercase">{row.subjectName}</td>
                    <td className="p-2">
                      <div className="space-y-1">
                        {(row.topics || []).map((topic, idx) => (
                          <div key={`${row._id}-topic-${idx}`} className="text-[10px]">
                            <p className="font-semibold text-black uppercase">{topic.topicName}</p>
                            <ol className="list-[lower-roman] list-inside text-slate-600">
                              {(topic.subTopics || []).map((sub, sIdx) => (
                                <li key={`${row._id}-topic-${idx}-sub-${sIdx}`} className="uppercase">
                                  {sub}
                                </li>
                              ))}
                            </ol>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${
                          row.status === "INACTIVE"
                            ? "bg-red-100 text-red-600"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {row.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="p-2 flex justify-center gap-2">
                      <button
                        onClick={() => handleEdit(row)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(row._id)}
                        className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-20 text-center font-black text-slate-300 uppercase text-xl">
                    No Records Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>

          <form
            onSubmit={handleSubmit}
            className="relative bg-white w-full max-w-4xl p-8 rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-tighter">
                {editId ? "Update" : "Add"} Syllabus
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-900 mb-1 block">
                    Syllabus ID
                  </label>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-blue-600 text-[11px]">
                    {formData.syllabusId || "..."}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-900 mb-1 block">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-semibold text-[11px] outline-none focus:border-blue-600"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-900 mb-1 block">Exam Name</label>
                  <select
                    required
                    value={formData.examId}
                    onChange={(e) =>
                      setFormData({ ...formData, examId: e.target.value, categoryId: "" })
                    }
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-semibold text-[11px] outline-none focus:border-blue-600"
                  >
                    <option value="">-- SELECT EXAM --</option>
                    {exams.map((ex) => (
                      <option key={ex._id} value={ex._id}>
                        {ex.examName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-900 mb-1 block">
                    Category Name
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-semibold text-[11px] outline-none focus:border-blue-600"
                  >
                    <option value="">-- SELECT CATEGORY --</option>
                    {filteredCategories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.catName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-900 mb-1 block">Subject Name</label>
                <input
                  required
                  type="text"
                  value={formData.subjectName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subjectName: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full p-3 border border-slate-200 rounded-xl font-semibold text-[11px] outline-none focus:border-blue-600"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-900 block">
                    Topic + Sub Topic 
                  </label>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="TOPIC NAME"
                      value={currentTopic.topicName}
                      onChange={(e) =>
                        setCurrentTopic((prev) => ({ ...prev, topicName: e.target.value.toUpperCase() }))
                      }
                      className="flex-1 p-3 border border-slate-200 rounded-xl font-semibold text-[11px] outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="SUB TOPIC NAME"
                      value={currentTopic.subTopicInput}
                      onChange={(e) =>
                        setCurrentTopic((prev) => ({ ...prev, subTopicInput: e.target.value.toUpperCase() }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSubTopicToCurrent();
                        }
                      }}
                      className="flex-1 p-3 border border-slate-200 rounded-xl font-semibold text-[11px] outline-none focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={addSubTopicToCurrent}
                      className="p-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {currentTopic.topicName && (
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold text-slate-900">{currentTopic.topicName}</p>
                      <ol className="list-[lower-roman] list-inside mt-1 text-[11px] font-bold text-slate-700">
                        {(currentTopic.subTopics || []).map((sub, sIdx) => (
                          <li key={`draft-sub-${sIdx}`} className="flex items-center justify-between uppercase">
                            <span>{sub}</span>
                            <button
                              type="button"
                              onClick={() => removeCurrentSubTopic(sIdx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={12} />
                            </button>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={saveTopicDraft}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase"
                  >
                    <PlusCircle size={14} />
                    Save Topic
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.topics.map((topic, idx) => (
                    <div key={`saved-topic-${idx}`} className="bg-white border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-slate-900">{topic.topicName}</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => editSavedTopic(idx)}
                            className="p-1 rounded text-blue-600 hover:bg-blue-50"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSavedTopic(idx)}
                            className="p-1 rounded text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <ol className="list-[lower-roman] list-inside mt-1 text-[11px] font-bold text-slate-700">
                        {(topic.subTopics || []).map((sub, sIdx) => (
                          <li key={`saved-sub-${idx}-${sIdx}`} className="uppercase">
                            {sub}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>

              <button
                disabled={isSaving}
                className="w-full py-2 mt-2 bg-[#0F172A] text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all flex justify-center items-center gap-3 active:scale-[0.98]"
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

export default SyllabusMaster;
