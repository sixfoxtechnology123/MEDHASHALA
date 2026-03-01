import React, { useEffect, useMemo, useState } from "react";
import { Edit, Loader2, Plus, RefreshCw, Save, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import axios from "../api/axios";

const toastErrorOnce = (msg) => toast.error(msg, { id: "one-error" });
const toastOkOnce = (msg) => toast.success(msg, { id: "one-success" });

const emptyQuestion = {
  questionBankId: "",
  marks: 1,
  negativeMarks: 0,
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "A",
  explanationText: "",
  status: "ACTIVE",
};

const nextBankId = (currentId) => {
  const n = parseInt(String(currentId || "").replace("QSBANK", ""), 10);
  return `QSBANK${(Number.isNaN(n) ? 0 : n) + 1}`;
};

const QuestionBank = () => {
  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ examMasterId: "", examCategoryId: "", examStage: "", subjectId: "", status: "" });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [baseForm, setBaseForm] = useState({ examMasterId: "", examCategoryId: "", examStage: "", subjectId: "" });
  const [questionForm, setQuestionForm] = useState({ ...emptyQuestion });
  const [draftQuestions, setDraftQuestions] = useState([]);

  const filteredCategories = useMemo(() => {
    if (!filters.examMasterId) return [];
    return categories.filter((cat) => String(cat.examCode || "").toUpperCase() === String(filters.examMasterId || "").toUpperCase());
  }, [categories, filters.examMasterId]);

  const filteredSubjects = useMemo(() => {
    if (!filters.examMasterId || !filters.examCategoryId) return [];
    return subjects.filter(
      (s) =>
        String(s.examCode || "").toUpperCase() === String(filters.examMasterId || "").toUpperCase() &&
        String(s.catId || "").toUpperCase() === String(filters.examCategoryId || "").toUpperCase() &&
        (!filters.examStage || String(s.examStage || "").toUpperCase() === String(filters.examStage || "").toUpperCase())
    );
  }, [subjects, filters.examMasterId, filters.examCategoryId, filters.examStage]);

  const modalFilteredCategories = useMemo(() => {
    if (!baseForm.examMasterId) return [];
    return categories.filter((cat) => String(cat.examCode || "").toUpperCase() === String(baseForm.examMasterId || "").toUpperCase());
  }, [categories, baseForm.examMasterId]);

  const modalFilteredSubjects = useMemo(() => {
    if (!baseForm.examMasterId || !baseForm.examCategoryId) return [];
    return subjects.filter(
      (s) =>
        String(s.examCode || "").toUpperCase() === String(baseForm.examMasterId || "").toUpperCase() &&
        String(s.catId || "").toUpperCase() === String(baseForm.examCategoryId || "").toUpperCase() &&
        (!baseForm.examStage || String(s.examStage || "").toUpperCase() === String(baseForm.examStage || "").toUpperCase())
    );
  }, [subjects, baseForm.examMasterId, baseForm.examCategoryId, baseForm.examStage]);

  const filterStageOptions = useMemo(() => {
    if (!filters.examMasterId || !filters.examCategoryId) return [];
    const selectedCategory = categories.find(
      (cat) =>
        String(cat.examCode || "").toUpperCase() === String(filters.examMasterId || "").toUpperCase() &&
        String(cat.catId || "").toUpperCase() === String(filters.examCategoryId || "").toUpperCase()
    );
    return selectedCategory?.examStage ? [String(selectedCategory.examStage).toUpperCase()] : [];
  }, [categories, filters.examMasterId, filters.examCategoryId]);

  const modalStageOptions = useMemo(() => {
    if (!baseForm.examMasterId || !baseForm.examCategoryId) return [];
    const selectedCategory = categories.find(
      (cat) =>
        String(cat.examCode || "").toUpperCase() === String(baseForm.examMasterId || "").toUpperCase() &&
        String(cat.catId || "").toUpperCase() === String(baseForm.examCategoryId || "").toUpperCase()
    );
    return selectedCategory?.examStage ? [String(selectedCategory.examStage).toUpperCase()] : [];
  }, [categories, baseForm.examMasterId, baseForm.examCategoryId]);

  const hasStageInRows = useMemo(
    () => rows.some((row) => String(row.examStage || "").trim()),
    [rows]
  );

  const fetchMasters = async () => {
    const [examRes, catRes, subRes] = await Promise.allSettled([
      axios.get("/master/exam"),
      axios.get("/master/category/all"),
      axios.get("/master/syllabus/all"),
    ]);
    setExams(examRes.status === "fulfilled" ? (Array.isArray(examRes.value.data) ? examRes.value.data : examRes.value.data?.data || []) : []);
    setCategories(catRes.status === "fulfilled" ? (Array.isArray(catRes.value.data) ? catRes.value.data : catRes.value.data?.data || []) : []);
    setSubjects(subRes.status === "fulfilled" ? (Array.isArray(subRes.value.data) ? subRes.value.data : subRes.value.data?.data || []) : []);
  };

  const fetchRows = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.examMasterId) params.set("examMasterId", filters.examMasterId);
      if (filters.examCategoryId) params.set("examCategoryId", filters.examCategoryId);
      if (filters.examStage) params.set("examStage", filters.examStage);
      if (filters.subjectId) params.set("subjectId", filters.subjectId);
      if (filters.status) params.set("status", filters.status);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      params.set("page", String(pagination.page));
      params.set("limit", String(pagination.limit));
      const res = await axios.get(`/master/question-bank/all?${params.toString()}`);
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      const pg = res.data?.pagination || {};
      setRows(list);
      setPagination((prev) => ({ ...prev, page: pg.page || prev.page, limit: pg.limit || prev.limit, totalPages: pg.totalPages || 1, total: pg.total || 0 }));
    } catch {
      toastErrorOnce("FAILED TO LOAD QUESTION BANK");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMasters(); }, []);
  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.examMasterId, filters.examCategoryId, filters.examStage, filters.subjectId, filters.status, pagination.page, pagination.limit]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchRows();
  };

  const openAddModal = async () => {
    try {
      const idRes = await axios.get("/master/question-bank/next-id");
      setEditId("");
      setDraftQuestions([]);
      setBaseForm({ examMasterId: "", examCategoryId: "", examStage: "", subjectId: "" });
      setQuestionForm({ ...emptyQuestion, questionBankId: idRes.data?.nextId || "QSBANK1" });
      setIsModalOpen(true);
    } catch {
      toastErrorOnce("FAILED TO GENERATE ID");
    }
  };

  const handleEdit = (row) => {
    setEditId(row._id);
    setDraftQuestions([]);
    setBaseForm({ examMasterId: row.examMasterId || "", examCategoryId: row.examCategoryId || "", examStage: row.examStage || "", subjectId: row.subjectId || "" });
    setQuestionForm({
      questionBankId: row.questionBankId || "",
      marks: Number(row.marks ?? 1),
      negativeMarks: Number(row.negativeMarks ?? 0),
      questionText: row.questionText || "",
      optionA: row.optionA || "",
      optionB: row.optionB || "",
      optionC: row.optionC || "",
      optionD: row.optionD || "",
      correctOption: row.correctOption || "A",
      explanationText: row.explanationText || "",
      status: row.status || "ACTIVE",
    });
    setIsModalOpen(true);
  };

  const validateQuestion = (q) => {
    if (!String(q.questionText || "").trim()) return "ENTER QUESTION";
    if (!String(q.optionA || "").trim() || !String(q.optionB || "").trim() || !String(q.optionC || "").trim() || !String(q.optionD || "").trim()) return "ENTER ALL OPTIONS";
    return "";
  };

  const addDraftQuestion = () => {
    if (!baseForm.examMasterId || !baseForm.examCategoryId || !baseForm.subjectId) return toastErrorOnce("SELECT EXAM, CATEGORY, SUBJECT");
    const err = validateQuestion(questionForm);
    if (err) return toastErrorOnce(err);
    setDraftQuestions((prev) => [...prev, { ...questionForm }]);
    setQuestionForm((prev) => ({ ...emptyQuestion, questionBankId: nextBankId(prev.questionBankId), marks: Number(prev.marks || 1), negativeMarks: Number(prev.negativeMarks || 0), status: prev.status || "ACTIVE" }));
  };

  const saveBatch = async () => {
    if (isSaving) return;
    if (!draftQuestions.length) return toastErrorOnce("ADD AT LEAST ONE QUESTION");
    setIsSaving(true);
    try {
      for (const q of draftQuestions) {
        await axios.post("/master/question-bank/upsert", { ...baseForm, ...q });
      }
      toastOkOnce("QUESTIONS SAVED");
      setIsModalOpen(false);
      fetchRows();
    } catch (err) {
      toastErrorOnce(err?.response?.data?.message || "SAVE FAILED");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    if (!baseForm.examMasterId || !baseForm.examCategoryId || !baseForm.subjectId) return toastErrorOnce("SELECT EXAM, CATEGORY, SUBJECT");

    if (editId) {
      const err = validateQuestion(questionForm);
      if (err) return toastErrorOnce(err);
      setIsSaving(true);
      try {
        await axios.post("/master/question-bank/upsert", { id: editId, ...baseForm, ...questionForm });
        toastOkOnce("UPDATED");
        setIsModalOpen(false);
        fetchRows();
      } catch (error) {
        toastErrorOnce(error?.response?.data?.message || "UPDATE FAILED");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    await saveBatch();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("ARE YOU SURE?")) return;
    try {
      await axios.delete(`/master/question-bank/${id}`);
      toastOkOnce("DELETED");
      fetchRows();
    } catch {
      toastErrorOnce("DELETE FAILED");
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F7FF]">
      <header className="p-2 space-y-2">
        <div className="bg-white px-4 py-2 rounded-[24px] border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-900">Question Bank</h1>
            <div className="flex items-center gap-3">
              <button onClick={fetchRows} className="p-2 bg-slate-50 text-slate-900 rounded-2xl border border-slate-100"><RefreshCw size={20} className={loading ? "animate-spin" : ""} /></button>
              <button onClick={openAddModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl text-xs shadow-lg"><Plus size={14} strokeWidth={3} />Add Question</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <select value={filters.examMasterId} onChange={(e) => { setFilters((prev) => ({ ...prev, examMasterId: e.target.value, examCategoryId: "", examStage: "", subjectId: "" })); setPagination((prev) => ({ ...prev, page: 1 })); }} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-normal">
              <option value="">All Exams</option>
              {exams.map((ex) => <option key={ex.examCode} value={ex.examCode}>{ex.examName}</option>)}
            </select>
            <select value={filters.examCategoryId} onChange={(e) => { const categoryId = e.target.value; const selectedCategory = categories.find((cat) => String(cat.examCode || "").toUpperCase() === String(filters.examMasterId || "").toUpperCase() && String(cat.catId || "").toUpperCase() === String(categoryId || "").toUpperCase()); setFilters((prev) => ({ ...prev, examCategoryId: categoryId, examStage: selectedCategory?.examStage || "", subjectId: "" })); setPagination((prev) => ({ ...prev, page: 1 })); }} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-normal">
              <option value="">All Categories</option>
              {filteredCategories.map((cat) => <option key={cat.catId} value={cat.catId}>{cat.catName}</option>)}
            </select>
            {filterStageOptions.length > 0 && (
              <select value={filters.examStage} onChange={(e) => { setFilters((prev) => ({ ...prev, examStage: e.target.value, subjectId: "" })); setPagination((prev) => ({ ...prev, page: 1 })); }} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-normal">
                <option value="">All Stages</option>
                {filterStageOptions.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
              </select>
            )}
            <select value={filters.subjectId} onChange={(e) => { setFilters((prev) => ({ ...prev, subjectId: e.target.value })); setPagination((prev) => ({ ...prev, page: 1 })); }} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-normal">
              <option value="">All Subjects</option>
              {filteredSubjects.map((sub) => <option key={sub.syllabusId} value={sub.syllabusId}>{sub.subjectName}</option>)}
            </select>
            <select value={filters.status} onChange={(e) => { setFilters((prev) => ({ ...prev, status: e.target.value })); setPagination((prev) => ({ ...prev, page: 1 })); }} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-normal">
              <option value="">All Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
            <select value={pagination.page} onChange={(e) => setPagination((prev) => ({ ...prev, page: Number(e.target.value) }))} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-normal">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => <option key={p} value={p}>Page {p}</option>)}
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="w-full pl-11 pr-28 py-2 border border-slate-200 rounded-xl text-sm font-normal" placeholder="Search question, ID, subject..." />
            <button onClick={handleSearch} className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 text-xs bg-slate-900 text-white rounded-lg">Search</button>
          </div>
        </div>
      </header>

      <section className="bg-white rounded-[10px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="bg-[#0F172A] text-white text-[11px] font-semibold"><th className="p-2">Q.ID</th><th className="p-2">Exam</th>{hasStageInRows && <th className="p-2">Stage</th>}<th className="p-2">Category</th><th className="p-2">Subject</th><th className="p-2">Marks</th><th className="p-2">Negative</th><th className="p-2">Status</th><th className="p-2 text-center">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <tr><td colSpan={hasStageInRows ? 9 : 8} className="p-20 text-center text-slate-300 font-semibold">Loading...</td></tr> : rows.length > 0 ? rows.map((row) => (
                <tr key={row._id} className="hover:bg-blue-50/30">
                  <td className="p-2 text-blue-600 text-sm font-semibold">{row.questionBankId}</td><td className="p-2 text-xs font-normal">{row.examName}</td>{hasStageInRows && <td className="p-2 text-xs font-normal">{row.examStage || "---"}</td>}<td className="p-2 text-xs font-normal">{row.categoryName}</td><td className="p-2 text-xs font-normal">{row.subjectName}</td><td className="p-2 text-xs font-normal">{row.marks}</td><td className="p-2 text-xs font-normal">{row.negativeMarks}</td><td className="p-2 text-xs font-normal">{row.status}</td>
                  <td className="p-2 flex justify-center gap-2"><button onClick={() => handleEdit(row)} className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Edit size={16} /></button><button onClick={() => handleDelete(row._id)} className="p-2 bg-red-50 text-red-400 rounded-xl"><Trash2 size={16} /></button></td>
                </tr>
              )) : <tr><td colSpan={hasStageInRows ? 9 : 8} className="p-20 text-center text-slate-300 font-semibold">No Records</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white w-full max-w-6xl p-8 rounded-[30px] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-semibold">{editId ? "Update Question" : "Add Multiple Questions"}</h2><button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="text-sm font-normal block mb-1">Exam</label><select required value={baseForm.examMasterId} onChange={(e) => setBaseForm({ ...baseForm, examMasterId: e.target.value, examCategoryId: "", examStage: "", subjectId: "" })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-normal"><option value="">-- Select Exam --</option>{exams.map((ex) => <option key={ex.examCode} value={ex.examCode}>{ex.examName}</option>)}</select></div>
              <div><label className="text-sm font-normal block mb-1">Category</label><select required value={baseForm.examCategoryId} onChange={(e) => { const categoryId = e.target.value; const selectedCategory = categories.find((cat) => String(cat.examCode || "").toUpperCase() === String(baseForm.examMasterId || "").toUpperCase() && String(cat.catId || "").toUpperCase() === String(categoryId || "").toUpperCase()); setBaseForm({ ...baseForm, examCategoryId: categoryId, examStage: selectedCategory?.examStage || "", subjectId: "" }); }} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-normal"><option value="">-- Select Category --</option>{modalFilteredCategories.map((cat) => <option key={cat.catId} value={cat.catId}>{cat.catName}</option>)}</select></div>
              {modalStageOptions.length > 0 && <div><label className="text-sm font-normal block mb-1">Exam Stage</label><select value={baseForm.examStage} onChange={(e) => setBaseForm({ ...baseForm, examStage: e.target.value, subjectId: "" })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-normal"><option value="">-- Select Stage --</option>{modalStageOptions.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></div>}
              <div><label className="text-sm font-normal block mb-1">Subject</label><select required value={baseForm.subjectId} onChange={(e) => setBaseForm({ ...baseForm, subjectId: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-normal"><option value="">-- Select Subject --</option>{modalFilteredSubjects.map((sub) => <option key={sub.syllabusId} value={sub.syllabusId}>{sub.subjectName}</option>)}</select></div>
            </div>
            <div className="mt-5 border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-sm font-normal block mb-1">Question ID</label><div className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-normal text-blue-600">{questionForm.questionBankId || "..."}</div></div>
                <div><label className="text-sm font-normal block mb-1">Marks / Question</label><input type="number" min="0" step="0.5" value={questionForm.marks} onChange={(e) => setQuestionForm({ ...questionForm, marks: Number(e.target.value) })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-normal" /></div>
                <div><label className="text-sm font-normal block mb-1">Negative Marks</label><input type="number" min="0" step="0.25" value={questionForm.negativeMarks} onChange={(e) => setQuestionForm({ ...questionForm, negativeMarks: Number(e.target.value) })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-normal" /></div>
              </div>
              <textarea value={questionForm.questionText} onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-normal" placeholder="Question" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input value={questionForm.optionA} onChange={(e) => setQuestionForm({ ...questionForm, optionA: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-normal" placeholder="Option A" />
                <input value={questionForm.optionB} onChange={(e) => setQuestionForm({ ...questionForm, optionB: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-normal" placeholder="Option B" />
                <input value={questionForm.optionC} onChange={(e) => setQuestionForm({ ...questionForm, optionC: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-normal" placeholder="Option C" />
                <input value={questionForm.optionD} onChange={(e) => setQuestionForm({ ...questionForm, optionD: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-normal" placeholder="Option D" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select value={questionForm.correctOption} onChange={(e) => setQuestionForm({ ...questionForm, correctOption: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-normal"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select>
                <select value={questionForm.status} onChange={(e) => setQuestionForm({ ...questionForm, status: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-normal"><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select>
              </div>
              <textarea value={questionForm.explanationText} onChange={(e) => setQuestionForm({ ...questionForm, explanationText: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-normal" placeholder="Explanation" />
              {!editId && <button type="button" onClick={addDraftQuestion} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-normal hover:bg-blue-700">Add In Draft List</button>}
            </div>
            {!editId && (
              <div className="mt-5 space-y-2">
                {draftQuestions.map((q, idx) => (
                  <div key={`${q.questionBankId}-${idx}`} className="bg-white border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-3">
                    <div><p className="text-sm font-semibold text-blue-700">{q.questionBankId}</p><p className="text-sm font-normal text-slate-800">{q.questionText}</p></div>
                    <div className="flex gap-2"><button type="button" onClick={() => { setQuestionForm({ ...q }); setDraftQuestions((prev) => prev.filter((_, i) => i !== idx)); }} className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Edit size={15} /></button><button type="button" onClick={() => setDraftQuestions((prev) => prev.filter((_, i) => i !== idx))} className="p-2 bg-red-50 text-red-500 rounded-xl"><Trash2 size={15} /></button></div>
                  </div>
                ))}
              </div>
            )}
            <button disabled={isSaving} className="w-full py-4 mt-6 bg-[#0F172A] text-white rounded-2xl hover:bg-blue-600 flex justify-center items-center gap-3 text-sm font-normal">{isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}{editId ? "Update Question" : "Final Submit All Draft"}</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
