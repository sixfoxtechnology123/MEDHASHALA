import React, { useEffect, useMemo, useState } from "react";
import { Edit, Eye, Loader2, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import axios from "../api/axios";

const toastErrorOnce = (msg) => toast.error(msg, { id: "one-error" });
const toastOkOnce = (msg) => toast.success(msg, { id: "one-success" });

const nextBankId = (currentId) => {
  const n = parseInt(String(currentId || "").replace("QSBANK", ""), 10);
  return `QSBANK${(Number.isNaN(n) ? 0 : n) + 1}`;
};

const QuestionInlineForm = ({ exams, categories, subjects, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [baseForm, setBaseForm] = useState({ examMasterId: "", examCategoryId: "", subjectId: "" });
  const [questionForm, setQuestionForm] = useState({
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
  });
  const [drafts, setDrafts] = useState([]);

  const filteredCategories = useMemo(() => {
    if (!baseForm.examMasterId) return [];
    return categories.filter((cat) => String(cat.examCode || "").toUpperCase() === String(baseForm.examMasterId || "").toUpperCase());
  }, [categories, baseForm.examMasterId]);

  const filteredSubjects = useMemo(() => {
    if (!baseForm.examMasterId || !baseForm.examCategoryId) return [];
    return subjects.filter(
      (s) =>
        String(s.examCode || "").toUpperCase() === String(baseForm.examMasterId || "").toUpperCase() &&
        String(s.catId || "").toUpperCase() === String(baseForm.examCategoryId || "").toUpperCase()
    );
  }, [subjects, baseForm.examMasterId, baseForm.examCategoryId]);

  const loadId = async () => {
    try {
      const res = await axios.get("/master/question-bank/next-id");
      setQuestionForm((prev) => ({ ...prev, questionBankId: res.data?.nextId || "QSBANK1" }));
    } catch {
      setQuestionForm((prev) => ({ ...prev, questionBankId: "QSBANK1" }));
    }
  };

  useEffect(() => { loadId(); }, []);

  const addDraft = () => {
    if (!baseForm.examMasterId || !baseForm.examCategoryId || !baseForm.subjectId) return toastErrorOnce("SELECT EXAM, CATEGORY, SUBJECT");
    if (!questionForm.questionText || !questionForm.optionA || !questionForm.optionB || !questionForm.optionC || !questionForm.optionD) {
      return toastErrorOnce("FILL QUESTION AND OPTIONS");
    }
    setDrafts((prev) => [...prev, { ...questionForm }]);
    setQuestionForm((prev) => ({
      ...prev,
      questionBankId: nextBankId(prev.questionBankId),
      questionText: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctOption: "A",
      explanationText: "",
    }));
  };

  const submitAll = async () => {
    if (saving) return;
    if (!drafts.length) return toastErrorOnce("ADD AT LEAST ONE DRAFT");
    setSaving(true);
    try {
      for (const q of drafts) {
        await axios.post("/master/question-bank/upsert", { ...baseForm, ...q });
      }
      toastOkOnce("DRAFT QUESTIONS SAVED");
      setDrafts([]);
      await loadId();
      if (onSaved) onSaved(baseForm.subjectId);
    } catch (err) {
      toastErrorOnce(err?.response?.data?.message || "FAILED");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-4 shadow-sm space-y-3">
      <p className="text-sm font-semibold text-slate-800">Instant Add Multiple Questions</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select value={baseForm.examMasterId} onChange={(e) => setBaseForm((p) => ({ ...p, examMasterId: e.target.value, examCategoryId: "", subjectId: "" }))} className="p-2 border border-slate-200 rounded-lg text-sm font-normal">
          <option value="">Exam</option>{exams.map((ex) => <option key={ex.examCode} value={ex.examCode}>{ex.examName}</option>)}
        </select>
        <select value={baseForm.examCategoryId} onChange={(e) => setBaseForm((p) => ({ ...p, examCategoryId: e.target.value, subjectId: "" }))} className="p-2 border border-slate-200 rounded-lg text-sm font-normal">
          <option value="">Category</option>{filteredCategories.map((cat) => <option key={cat.catId} value={cat.catId}>{cat.catName}</option>)}
        </select>
        <select value={baseForm.subjectId} onChange={(e) => setBaseForm((p) => ({ ...p, subjectId: e.target.value }))} className="p-2 border border-slate-200 rounded-lg text-sm font-normal">
          <option value="">Subject</option>{filteredSubjects.map((sub) => <option key={sub.syllabusId} value={sub.syllabusId}>{sub.subjectName}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="p-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-blue-700">{questionForm.questionBankId || "QSBANK..."}</div>
        <input type="number" min="0" step="0.5" value={questionForm.marks} onChange={(e) => setQuestionForm((p) => ({ ...p, marks: Number(e.target.value) }))} placeholder="Marks" className="p-2 border border-slate-200 rounded-lg text-sm font-normal" />
        <input type="number" min="0" step="0.25" value={questionForm.negativeMarks} onChange={(e) => setQuestionForm((p) => ({ ...p, negativeMarks: Number(e.target.value) }))} placeholder="Negative Marks" className="p-2 border border-slate-200 rounded-lg text-sm font-normal" />
      </div>
      <textarea value={questionForm.questionText} onChange={(e) => setQuestionForm((p) => ({ ...p, questionText: e.target.value }))} placeholder="Question" className="w-full p-2 border border-slate-200 rounded-lg text-sm font-normal" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input value={questionForm.optionA} onChange={(e) => setQuestionForm((p) => ({ ...p, optionA: e.target.value }))} placeholder="Option A" className="p-2 border border-slate-200 rounded-lg text-sm font-normal" />
        <input value={questionForm.optionB} onChange={(e) => setQuestionForm((p) => ({ ...p, optionB: e.target.value }))} placeholder="Option B" className="p-2 border border-slate-200 rounded-lg text-sm font-normal" />
        <input value={questionForm.optionC} onChange={(e) => setQuestionForm((p) => ({ ...p, optionC: e.target.value }))} placeholder="Option C" className="p-2 border border-slate-200 rounded-lg text-sm font-normal" />
        <input value={questionForm.optionD} onChange={(e) => setQuestionForm((p) => ({ ...p, optionD: e.target.value }))} placeholder="Option D" className="p-2 border border-slate-200 rounded-lg text-sm font-normal" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <select value={questionForm.correctOption} onChange={(e) => setQuestionForm((p) => ({ ...p, correctOption: e.target.value }))} className="p-2 border border-slate-200 rounded-lg text-sm font-normal"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select>
        <select value={questionForm.status} onChange={(e) => setQuestionForm((p) => ({ ...p, status: e.target.value }))} className="p-2 border border-slate-200 rounded-lg text-sm font-normal"><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select>
      </div>
      <textarea value={questionForm.explanationText} onChange={(e) => setQuestionForm((p) => ({ ...p, explanationText: e.target.value }))} placeholder="Explanation" className="w-full p-2 border border-slate-200 rounded-lg text-sm font-normal" />
      <div className="flex gap-2">
        <button type="button" onClick={addDraft} className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white">Add Draft</button>
        <button type="button" disabled={saving} onClick={submitAll} className="px-4 py-2 text-xs rounded-lg bg-slate-900 text-white">{saving ? "Saving..." : "Final Submit"}</button>
      </div>
      <div className="space-y-1">
        {drafts.map((d, i) => (
          <div key={`${d.questionBankId}-${i}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2">
            <p className="text-xs font-normal">{d.questionBankId} - {d.questionText}</p>
            <button type="button" onClick={() => setDrafts((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-500 text-xs">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const MockTest = () => {
  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sets, setSets] = useState([]);
  const [questionBankRows, setQuestionBankRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ examMasterId: "", examStage: "", examCategoryId: "", subjectId: "" });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [form, setForm] = useState({
    questionSetId: "",
    examMasterId: "",
    examStage: "",
    examCategoryId: "",
    subjectId: "",
    testDate: new Date().toISOString().slice(0, 10),
    status: "ACTIVE",
    selectionType: "AUTO",
    questionCount: 10,
    questionIds: [],
  });
  const [showOnlySetQuestions, setShowOnlySetQuestions] = useState(true);
  const hasSetStage = useMemo(
    () => sets.some((row) => String(row.examStage || "").trim()),
    [sets]
  );

  const filteredCategories = useMemo(() => {
    if (!filters.examMasterId) return [];
    return categories.filter(
      (cat) => String(cat.examCode || "").toUpperCase() === String(filters.examMasterId || "").toUpperCase()
    );
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
    if (!form.examMasterId) return [];
    return categories.filter(
      (cat) => String(cat.examCode || "").toUpperCase() === String(form.examMasterId || "").toUpperCase()
    );
  }, [categories, form.examMasterId]);

  const modalFilteredSubjects = useMemo(() => {
    if (!form.examMasterId || !form.examCategoryId) return [];
    return subjects.filter(
      (s) =>
        String(s.examCode || "").toUpperCase() === String(form.examMasterId || "").toUpperCase() &&
        String(s.catId || "").toUpperCase() === String(form.examCategoryId || "").toUpperCase() &&
        (!form.examStage || String(s.examStage || "").toUpperCase() === String(form.examStage || "").toUpperCase())
    );
  }, [subjects, form.examMasterId, form.examCategoryId, form.examStage]);

  const filterStageOptions = useMemo(() => {
    if (!filters.examMasterId || !filters.examCategoryId) return [];
    const selectedCategory = categories.find(
      (cat) =>
        String(cat.catId || "").toUpperCase() === String(filters.examCategoryId || "").toUpperCase() &&
        String(cat.examCode || "").toUpperCase() === String(filters.examMasterId || "").toUpperCase()
    );
    return selectedCategory?.examStage ? [String(selectedCategory.examStage).toUpperCase()] : [];
  }, [categories, filters.examMasterId, filters.examCategoryId]);

  const modalStageOptions = useMemo(() => {
    if (!form.examMasterId || !form.examCategoryId) return [];
    const selectedCategory = categories.find(
      (cat) =>
        String(cat.catId || "").toUpperCase() === String(form.examCategoryId || "").toUpperCase() &&
        String(cat.examCode || "").toUpperCase() === String(form.examMasterId || "").toUpperCase()
    );
    return selectedCategory?.examStage ? [String(selectedCategory.examStage).toUpperCase()] : [];
  }, [categories, form.examMasterId, form.examCategoryId]);

  const fetchMasters = async () => {
    const [examRes, catRes, subRes] = await Promise.allSettled([axios.get("/master/exam"), axios.get("/master/category/all"), axios.get("/master/syllabus/all")]);
    setExams(examRes.status === "fulfilled" ? (Array.isArray(examRes.value.data) ? examRes.value.data : examRes.value.data?.data || []) : []);
    setCategories(catRes.status === "fulfilled" ? (Array.isArray(catRes.value.data) ? catRes.value.data : catRes.value.data?.data || []) : []);
    setSubjects(subRes.status === "fulfilled" ? (Array.isArray(subRes.value.data) ? subRes.value.data : subRes.value.data?.data || []) : []);
  };

  const fetchSets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.examMasterId) params.set("examMasterId", filters.examMasterId);
      if (filters.examStage) params.set("examStage", filters.examStage);
      if (filters.examCategoryId) params.set("examCategoryId", filters.examCategoryId);
      if (filters.subjectId) params.set("subjectId", filters.subjectId);
      params.set("page", String(pagination.page));
      params.set("limit", String(pagination.limit));
      const res = await axios.get(`/master/mock-test/all?${params.toString()}`);
      setSets(Array.isArray(res.data?.data) ? res.data.data : []);
      setPagination((prev) => ({ ...prev, page: res.data?.pagination?.page || prev.page, totalPages: res.data?.pagination?.totalPages || 1 }));
    } catch {
      toastErrorOnce("FAILED TO LOAD QUESTION SETS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMasters(); }, []);
  useEffect(() => {
    fetchSets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.examMasterId, filters.examStage, filters.examCategoryId, filters.subjectId, pagination.page]);

  const fetchQuestionBankRows = async (subjectId) => {
    if (!subjectId) return setQuestionBankRows([]);
    try {
      const res = await axios.get(`/master/question-bank/all?subjectId=${encodeURIComponent(subjectId)}&status=ACTIVE&page=1&limit=1000`);
      setQuestionBankRows(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setQuestionBankRows([]);
    }
  };

  const openAddModal = async () => {
    try {
      const idRes = await axios.get("/master/mock-test/next-id");
      setEditId("");
      setIsViewOnly(false);
      setForm({ questionSetId: idRes.data?.nextId || "QSET1", examMasterId: "", examStage: "", examCategoryId: "", subjectId: "", testDate: new Date().toISOString().slice(0, 10), status: "ACTIVE", selectionType: "AUTO", questionCount: 10, questionIds: [] });
      setQuestionBankRows([]);
      setIsModalOpen(true);
    } catch {
      toastErrorOnce("FAILED TO GENERATE SET ID");
    }
  };

  const handleViewOrEdit = async (id, canEdit) => {
    try {
      const res = await axios.get(`/master/mock-test/set/${id}`);
      const row = res.data?.data;
      if (!row) return;
      setEditId(canEdit ? row._id : "");
      setIsViewOnly(!canEdit);
      setShowOnlySetQuestions(true);
      setForm({
        questionSetId: row.questionSetId || "",
        examMasterId: row.examMasterId || "",
        examStage: row.examStage || "",
        examCategoryId: row.examCategoryId || "",
        subjectId: row.subjectId || "",
        testDate: row.testDate ? new Date(row.testDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        status: row.status || "ACTIVE",
        selectionType: "MANUAL",
        questionCount: (row.questionIds || []).length || 10,
        questionIds: (row.questionIds || []).map((q) => (typeof q === "string" ? q : q.questionBankId || q._id)),
      });
      const details = Array.isArray(row.questionDetails) ? row.questionDetails : [];
      setQuestionBankRows(details);
      setIsModalOpen(true);
    } catch {
      toastErrorOnce("FAILED TO LOAD SET");
    }
  };

  const autoPickQuestions = async (forceRestart = false) => {
    if (isViewOnly) return toastErrorOnce("VIEW MODE ENABLED");
    if (!form.examMasterId || !form.examCategoryId || !form.subjectId) return toastErrorOnce("SELECT EXAM, CATEGORY, SUBJECT");
    try {
      const params = new URLSearchParams();
      params.set("examMasterId", form.examMasterId);
      params.set("examCategoryId", form.examCategoryId);
      params.set("subjectId", form.subjectId);
      params.set("count", String(form.questionCount || 10));
      if (forceRestart) params.set("forceRestart", "true");
      const res = await axios.get(`/master/mock-test/suggest-questions?${params.toString()}`);
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      if (res.data?.exhausted && !forceRestart) {
        const ok = window.confirm(res.data?.message || "All questions used. Start again from first?");
        if (ok) return autoPickQuestions(true);
        return;
      }
      setForm((prev) => ({ ...prev, questionIds: data.map((q) => q.questionBankId || q._id) }));
      toastOkOnce(`SELECTED ${data.length} QUESTIONS`);
    } catch (err) {
      toastErrorOnce(err?.response?.data?.message || "AUTO PICK FAILED");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (isViewOnly) return;
    if (!form.examMasterId || !form.examCategoryId || !form.subjectId) return toastErrorOnce("SELECT EXAM, CATEGORY, SUBJECT");
    if (!form.testDate) return toastErrorOnce("SELECT TEST DATE");
    if (!form.questionIds.length) return toastErrorOnce("SELECT QUESTIONS");
    setSaving(true);
    try {
      await axios.post("/master/mock-test/upsert", {
        id: editId || undefined,
        questionSetId: form.questionSetId,
        examMasterId: form.examMasterId,
        examStage: form.examStage || undefined,
        examCategoryId: form.examCategoryId,
        subjectId: form.subjectId,
        testDate: form.testDate,
        status: form.status,
        isActive: form.status === "ACTIVE",
        isSelectedForAttempt: false,
        questionIds: form.questionIds,
      });
      toastOkOnce(editId ? "SET UPDATED" : "SET CREATED");
      setIsModalOpen(false);
      fetchSets();
    } catch (err) {
      toastErrorOnce(err?.response?.data?.message || "SAVE FAILED");
    } finally {
      setSaving(false);
    }
  };

  const selectForStudent = async (id, selected) => {
    try {
      await axios.post(`/master/mock-test/select-for-student/${id}`, { selected });
      toastOkOnce(selected ? "THIS SET WILL SHOW IN STUDENT MOCK TEST" : "SET DESELECTED");
      fetchSets();
    } catch (err) {
      toastErrorOnce(err?.response?.data?.message || "FAILED TO SELECT SET");
    }
  };

  const removeSet = async (id) => {
    if (!window.confirm("ARE YOU SURE?")) return;
    try {
      await axios.delete(`/master/mock-test/${id}`);
      toastOkOnce("DELETED");
      fetchSets();
    } catch {
      toastErrorOnce("DELETE FAILED");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#eff6ff_38%,_#f8fafc_70%)]">
      <header className="p-2 space-y-2">
        <div className="px-4 py-3 rounded-[28px] border border-sky-100 bg-white/95 shadow-[0_8px_25px_rgba(2,132,199,0.12)] flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-900">Mock Test Question Sets</h1>
            <div className="flex items-center gap-3">
              <button onClick={fetchSets} className="p-2 bg-slate-50 text-slate-900 rounded-2xl border border-slate-100"><RefreshCw size={20} className={loading ? "animate-spin" : ""} /></button>
              <button onClick={() => setIsQuestionModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white px-4 py-2 rounded-2xl text-xs shadow-lg"><Plus size={14} strokeWidth={3} />Instant Add Question</button>
              <button onClick={openAddModal} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-2xl text-xs shadow-lg"><Plus size={14} strokeWidth={3} />Add Question Set</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select value={filters.examMasterId} onChange={(e) => { setFilters((p) => ({ ...p, examMasterId: e.target.value, examStage: "", examCategoryId: "", subjectId: "" })); setPagination((p) => ({ ...p, page: 1 })); }} className="p-2 border border-slate-200 rounded-xl text-sm font-normal"><option value="">All Exams</option>{exams.map((ex) => <option key={ex.examCode} value={ex.examCode}>{ex.examName}</option>)}</select>
            <select value={filters.examCategoryId} onChange={(e) => { const categoryId = e.target.value; const selectedCategory = categories.find((cat) => String(cat.catId || "").toUpperCase() === String(categoryId || "").toUpperCase() && String(cat.examCode || "").toUpperCase() === String(filters.examMasterId || "").toUpperCase()); setFilters((p) => ({ ...p, examCategoryId: categoryId, examStage: selectedCategory?.examStage || "", subjectId: "" })); setPagination((p) => ({ ...p, page: 1 })); }} className="p-2 border border-slate-200 rounded-xl text-sm font-normal"><option value="">All Categories</option>{filteredCategories.map((cat) => <option key={cat.catId} value={cat.catId}>{cat.catName}</option>)}</select>
            {filterStageOptions.length > 0 && (
              <select value={filters.examStage} onChange={(e) => { setFilters((p) => ({ ...p, examStage: e.target.value, subjectId: "" })); setPagination((p) => ({ ...p, page: 1 })); }} className="p-2 border border-slate-200 rounded-xl text-sm font-normal">
                <option value="">All Stages</option>
                {filterStageOptions.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
              </select>
            )}
            <select value={filters.subjectId} onChange={(e) => { setFilters((p) => ({ ...p, subjectId: e.target.value })); setPagination((p) => ({ ...p, page: 1 })); }} className="p-2 border border-slate-200 rounded-xl text-sm font-normal"><option value="">All Subjects</option>{filteredSubjects.map((sub) => <option key={sub.syllabusId} value={sub.syllabusId}>{sub.subjectName}</option>)}</select>
            <select value={pagination.page} onChange={(e) => setPagination((p) => ({ ...p, page: Number(e.target.value) }))} className="p-2 border border-slate-200 rounded-xl text-sm font-normal">{Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => <option key={p} value={p}>Page {p}</option>)}</select>
          </div>
        </div>
      </header>

      <section className="bg-white rounded-[12px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="bg-[#0F172A] text-white text-[11px] font-semibold"><th className="p-2">Set ID</th><th className="p-2">Date</th><th className="p-2">Exam</th>{hasSetStage && <th className="p-2">Stage</th>}<th className="p-2">Category</th><th className="p-2">Subject</th><th className="p-2">Status</th><th className="p-2">Student</th><th className="p-2 text-center">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <tr><td colSpan={hasSetStage ? 9 : 8} className="p-20 text-center text-slate-300 font-semibold">Loading...</td></tr> : sets.length > 0 ? sets.map((row) => (
                <tr key={row._id} className="hover:bg-blue-50/30">
                  <td className="p-2 text-blue-600 text-sm font-semibold">{row.questionSetId}</td><td className="p-2 text-xs font-normal">{new Date(row.testDate).toLocaleDateString()}</td><td className="p-2 text-xs font-normal">{row.examName}</td>{hasSetStage && <td className="p-2 text-xs font-normal">{row.examStage || "---"}</td>}<td className="p-2 text-xs font-normal">{row.categoryName}</td><td className="p-2 text-xs font-normal">{row.subjectName}</td><td className="p-2 text-xs font-normal">{row.status}</td>
                  <td className="p-2 text-xs font-semibold">
                    {row.isSelectedForAttempt ? (
                      <button onClick={() => selectForStudent(row._id, false)} className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-rose-500 hover:to-red-500 text-[11px] shadow-sm">
                        Visible (Click Hide)
                      </button>
                    ) : (
                      <button onClick={() => selectForStudent(row._id, true)} className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white text-[11px] border border-slate-200">
                        Hidden (Click Show)
                      </button>
                    )}
                  </td>
                  <td className="p-2 flex justify-center gap-2"><button onClick={() => handleViewOrEdit(row._id, false)} className="p-2 bg-slate-100 text-slate-600 rounded-xl"><Eye size={16} /></button><button onClick={() => handleViewOrEdit(row._id, true)} className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Edit size={16} /></button><button onClick={() => removeSet(row._id)} className="p-2 bg-red-50 text-red-400 rounded-xl"><Trash2 size={16} /></button></td>
                </tr>
              )) : <tr><td colSpan={hasSetStage ? 9 : 8} className="p-20 text-center text-slate-300 font-semibold">No Records</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={submit} className="relative bg-white w-full max-w-6xl p-6 rounded-[28px] shadow-2xl max-h-[90vh] overflow-y-auto border border-sky-100">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">{editId ? "Edit Question Set" : "Add Question Set"}</h2><button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button></div>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              <input value={form.questionSetId} readOnly className="p-2 border border-slate-200 rounded-xl text-sm font-normal bg-slate-50" />
              <input disabled={isViewOnly} type="date" value={form.testDate} onChange={(e) => setForm((p) => ({ ...p, testDate: e.target.value }))} className="p-2 border border-slate-200 rounded-xl text-sm font-normal disabled:bg-slate-100" />
              <select disabled={isViewOnly} value={form.examMasterId} onChange={(e) => setForm((p) => ({ ...p, examMasterId: e.target.value, examStage: "", examCategoryId: "", subjectId: "", questionIds: [] }))} className="p-2 border border-slate-200 rounded-xl text-sm font-normal disabled:bg-slate-100"><option value="">Exam</option>{exams.map((ex) => <option key={ex.examCode} value={ex.examCode}>{ex.examName}</option>)}</select>
              <select disabled={isViewOnly} value={form.examCategoryId} onChange={(e) => { const categoryId = e.target.value; const selectedCategory = categories.find((cat) => String(cat.catId || "").toUpperCase() === String(categoryId || "").toUpperCase() && String(cat.examCode || "").toUpperCase() === String(form.examMasterId || "").toUpperCase()); setForm((p) => ({ ...p, examCategoryId: categoryId, examStage: selectedCategory?.examStage || "", subjectId: "", questionIds: [] })); }} className="p-2 border border-slate-200 rounded-xl text-sm font-normal disabled:bg-slate-100"><option value="">Category</option>{modalFilteredCategories.map((cat) => <option key={cat.catId} value={cat.catId}>{cat.catName}</option>)}</select>
              {modalStageOptions.length > 0 && (
                <select disabled={isViewOnly} value={form.examStage} onChange={(e) => setForm((p) => ({ ...p, examStage: e.target.value, subjectId: "", questionIds: [] }))} className="p-2 border border-slate-200 rounded-xl text-sm font-normal disabled:bg-slate-100">
                  <option value="">Stage</option>
                  {modalStageOptions.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                </select>
              )}
              <select disabled={isViewOnly} value={form.subjectId} onChange={async (e) => { const sid = e.target.value; setForm((p) => ({ ...p, subjectId: sid, questionIds: [] })); await fetchQuestionBankRows(sid); }} className="p-2 border border-slate-200 rounded-xl text-sm font-normal disabled:bg-slate-100"><option value="">Subject</option>{modalFilteredSubjects.map((sub) => <option key={sub.syllabusId} value={sub.syllabusId}>{sub.subjectName}</option>)}</select>
              <select disabled={isViewOnly} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="p-2 border border-slate-200 rounded-xl text-sm font-normal disabled:bg-slate-100"><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select>
            </div>
            {!editId && (
              <div className="mt-4 border border-slate-200 rounded-2xl p-3 bg-gradient-to-r from-cyan-50 to-blue-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select value={form.selectionType} onChange={(e) => setForm((p) => ({ ...p, selectionType: e.target.value, questionIds: [] }))} className="p-2 border border-slate-200 rounded-xl text-sm font-normal"><option value="AUTO">AUTO NEXT QUESTIONS</option><option value="MANUAL">MANUAL SELECT</option></select>
                  <input type="number" min="1" value={form.questionCount} onChange={(e) => setForm((p) => ({ ...p, questionCount: Number(e.target.value) }))} className="p-2 border border-slate-200 rounded-xl text-sm font-normal" />
                  {form.selectionType === "AUTO" ? <button type="button" onClick={() => autoPickQuestions(false)} className="px-3 py-2 bg-blue-600 text-white text-xs rounded-lg">Auto Pick Next Questions</button> : <div className="px-3 py-2 text-xs text-slate-500 rounded-lg bg-white border border-slate-200">Manual mode enabled</div>}
                </div>
              </div>
            )}
            {editId && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (showOnlySetQuestions) {
                      await fetchQuestionBankRows(form.subjectId);
                      setShowOnlySetQuestions(false);
                    } else {
                      const res = await axios.get(`/master/mock-test/set/${editId}`);
                      const row = res.data?.data;
                      setQuestionBankRows(Array.isArray(row?.questionDetails) ? row.questionDetails : []);
                      setShowOnlySetQuestions(true);
                    }
                  }}
                  className="px-3 py-2 text-xs rounded-lg bg-slate-100 text-slate-700"
                >
                  {showOnlySetQuestions ? "Show All Subject Questions" : "Show Only This Set Questions"}
                </button>
              </div>
            )}
            <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden">
              <div className="max-h-[40vh] overflow-auto">
                <table className="w-full text-left"><thead><tr className="bg-slate-100 text-slate-700 text-xs font-semibold"><th className="p-2">Select</th><th className="p-2">Q.ID</th><th className="p-2">Question</th><th className="p-2">Marks</th><th className="p-2">Negative</th></tr></thead>
                  <tbody>
                    {questionBankRows.map((q) => {
                      const qbId = q.questionBankId || q._id;
                      const checked = form.questionIds.includes(qbId);
                      return (
                        <tr key={qbId} className="border-t border-slate-100">
                          <td className="p-2"><input type="checkbox" checked={checked} onChange={() => setForm((prev) => ({ ...prev, questionIds: checked ? prev.questionIds.filter((x) => x !== qbId) : [...prev.questionIds, qbId] }))} disabled={isViewOnly || (!editId && form.selectionType === "AUTO")} /></td>
                          <td className="p-2 text-xs font-semibold text-blue-600">{q.questionBankId}</td><td className="p-2 text-xs font-normal">{q.questionText}</td><td className="p-2 text-xs font-normal">{q.marks}</td><td className="p-2 text-xs font-normal">{q.negativeMarks}</td>
                        </tr>
                      );
                    })}
                    {questionBankRows.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-xs text-slate-400">No questions found for selected subject.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-600">Selected Questions: {form.questionIds.length}</p>
            {!isViewOnly && <button disabled={saving} className="w-full py-3 mt-4 bg-[#0F172A] text-white rounded-xl flex items-center justify-center gap-2 text-sm font-normal">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{editId ? "Update Set" : "Create Set"}</button>}
          </form>
        </div>
      )}

      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsQuestionModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-5xl p-6 rounded-[28px] shadow-2xl max-h-[90vh] overflow-y-auto border border-cyan-100">
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-semibold">Instant Add Question</h2><button type="button" onClick={() => setIsQuestionModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button></div>
            <QuestionInlineForm exams={exams} categories={categories} subjects={subjects} onSaved={(sid) => fetchQuestionBankRows(sid || form.subjectId)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MockTest;
