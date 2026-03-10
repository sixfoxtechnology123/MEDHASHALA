import React, { useEffect, useMemo, useRef, useState } from "react";
import { Edit, Loader2, Plus, RefreshCw, Save, Search, Trash2, X,ChevronRight } from "lucide-react";
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
  questionImages: [],
  optionImages: { A: [], B: [], C: [], D: [] },
  explanationImages: [],
  status: "ACTIVE",
};

const nextBankId = (currentId) => {
  const n = parseInt(String(currentId || "").replace("QSBANK", ""), 10);
  return `QSBANK${(Number.isNaN(n) ? 0 : n) + 1}`;
};

const isNoCategoryValue = (value) => {
  const v = String(value || "").trim().toUpperCase();
  return !v || v === "NO CATEGORY" || v === "NO_CATEGORY" || v === "NONE";
};

const QuestionBank = () => {
  const [exams, setExams] = useState([]);
  const [showSymbols, setShowSymbols] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ examMasterId: "", examCategoryId: "", examStage: "", subjectId: "", topicName: "", subTopicName: "", status: "" });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [baseForm, setBaseForm] = useState({ examMasterId: "", examCategoryId: "", examStage: "", subjectId: "", topicName: "", subTopicName: "" });
  const [questionForm, setQuestionForm] = useState({ ...emptyQuestion });
  const [draftQuestions, setDraftQuestions] = useState([]);
  const [activeField, setActiveField] = useState("questionText");
  const fieldRefs = useRef({});

const symbolPalette = [

  // BASIC MATH
  "+", "−", "×", "÷", "=", "≠", "≈", "≡",
  "<", ">", "≤", "≥", "±", "∓",

  // ALGEBRA / CALCULUS
  "√", "∛", "∜",
  "∑", "∏",
  "∫", "∬", "∭",
  "∂", "∇",
  "∞", "∝",
  "∠", "∟",

  // SET THEORY
  "∈", "∉",
  "∅",
  "⊂", "⊃",
  "⊆", "⊇",
  "∪", "∩",

  // LOGIC
  "¬", "∧", "∨",
  "⇒", "⇔",
  "∀", "∃",

  // ARROWS
  "→", "←", "↑", "↓",
  "↔", "↕",
  "⇒", "⇐", "⇔",

  // GREEK LETTERS (COMMON IN MATH & PHYSICS)
  "α","β","γ","δ","ε","ζ","η","θ",
  "ι","κ","λ","μ","ν","ξ","ο","π",
  "ρ","σ","τ","υ","φ","χ","ψ","ω",

  // CAPITAL GREEK
  "Α","Β","Γ","Δ","Ε","Ζ","Η","Θ",
  "Ι","Κ","Λ","Μ","Ν","Ξ","Ο","Π",
  "Ρ","Σ","Τ","Υ","Φ","Χ","Ψ","Ω",

  // PHYSICS SYMBOLS
  "Δ","λ","μ","ρ","σ","τ","ω",
  "ħ","ϕ","ϑ","ϱ",

  // CHEMISTRY / SCIENCE
  "°", "℃", "℉",
  "Å", "Å",
  "mol", "Na", "Cl",

  // UNITS
  "m","cm","mm",
  "kg","g",
  "s","ms",
  "A","V","W","J","N","Pa","Hz",

  // MISC
  "°", "′", "″",
  "…", "•", "∴", "∵"

];
  const fieldLabels = {
    questionText: "Question",
    optionA: "Option A",
    optionB: "Option B",
    optionC: "Option C",
    optionD: "Option D",
    explanationText: "Explanation",
  };

  const filteredCategories = useMemo(() => {
    if (!filters.examMasterId) return [];
    return categories.filter((cat) => String(cat.examCode || "").toUpperCase() === String(filters.examMasterId || "").toUpperCase());
  }, [categories, filters.examMasterId]);
  const filterNeedsCategory = useMemo(() => filteredCategories.length > 0, [filteredCategories]);

  const filteredSubjects = useMemo(() => {
    if (!filters.examMasterId) return [];
    const needsCategory = categories.some((cat) => String(cat.examCode || "").toUpperCase() === String(filters.examMasterId || "").toUpperCase());
    if (needsCategory && !filters.examCategoryId) return [];
    return subjects.filter(
      (s) =>
        String(s.examCode || "").toUpperCase() === String(filters.examMasterId || "").toUpperCase() &&
        (
          !needsCategory
            ? isNoCategoryValue(s.catId)
            : String(s.catId || "").toUpperCase() === String(filters.examCategoryId || "").toUpperCase()
        ) &&
        (!filters.examStage || String(s.examStage || "").toUpperCase() === String(filters.examStage || "").toUpperCase())
    );
  }, [categories, subjects, filters.examMasterId, filters.examCategoryId, filters.examStage]);

  const modalFilteredCategories = useMemo(() => {
    if (!baseForm.examMasterId) return [];
    return categories.filter((cat) => String(cat.examCode || "").toUpperCase() === String(baseForm.examMasterId || "").toUpperCase());
  }, [categories, baseForm.examMasterId]);
  const modalNeedsCategory = useMemo(() => modalFilteredCategories.length > 0, [modalFilteredCategories]);

  const modalFilteredSubjects = useMemo(() => {
    if (!baseForm.examMasterId) return [];
    const needsCategory = categories.some((cat) => String(cat.examCode || "").toUpperCase() === String(baseForm.examMasterId || "").toUpperCase());
    if (needsCategory && !baseForm.examCategoryId) return [];
    return subjects.filter(
      (s) =>
        String(s.examCode || "").toUpperCase() === String(baseForm.examMasterId || "").toUpperCase() &&
        (
          !needsCategory
            ? isNoCategoryValue(s.catId)
            : String(s.catId || "").toUpperCase() === String(baseForm.examCategoryId || "").toUpperCase()
        ) &&
        (!baseForm.examStage || String(s.examStage || "").toUpperCase() === String(baseForm.examStage || "").toUpperCase())
    );
  }, [categories, subjects, baseForm.examMasterId, baseForm.examCategoryId, baseForm.examStage]);

  const filterStageOptions = useMemo(() => {
    if (!filters.examMasterId || !filters.examCategoryId) return [];
    const selectedCategory = categories.find(
      (cat) =>
        String(cat.examCode || "").toUpperCase() === String(filters.examMasterId || "").toUpperCase() &&
        String(cat.catId || "").toUpperCase() === String(filters.examCategoryId || "").toUpperCase()
    );
    return Array.from(
      new Set(
        [ ...(Array.isArray(selectedCategory?.examStages) ? selectedCategory.examStages : []), selectedCategory?.examStage ]
          .map((s) => String(s || "").trim().toUpperCase())
          .filter(Boolean)
      )
    );
  }, [categories, filters.examMasterId, filters.examCategoryId]);

  const modalStageOptions = useMemo(() => {
    if (!baseForm.examMasterId || !baseForm.examCategoryId) return [];
    const selectedCategory = categories.find(
      (cat) =>
        String(cat.examCode || "").toUpperCase() === String(baseForm.examMasterId || "").toUpperCase() &&
        String(cat.catId || "").toUpperCase() === String(baseForm.examCategoryId || "").toUpperCase()
    );
    return Array.from(
      new Set(
        [ ...(Array.isArray(selectedCategory?.examStages) ? selectedCategory.examStages : []), selectedCategory?.examStage ]
          .map((s) => String(s || "").trim().toUpperCase())
          .filter(Boolean)
      )
    );
  }, [categories, baseForm.examMasterId, baseForm.examCategoryId]);
  const filterNeedsStage = useMemo(() => filterNeedsCategory && filterStageOptions.length > 0, [filterNeedsCategory, filterStageOptions]);
  const modalNeedsStage = useMemo(() => modalNeedsCategory && modalStageOptions.length > 0, [modalNeedsCategory, modalStageOptions]);

  const hasStageInRows = useMemo(
    () => rows.some((row) => String(row.examStage || "").trim()),
    [rows]
  );
  const hasTopicInRows = useMemo(
    () => rows.some((row) => String(row.topicName || "").trim() || String(row.subTopicName || "").trim()),
    [rows]
  );

  const filterTopicOptions = useMemo(() => {
    const selectedSubject = subjects.find(
      (s) => String(s.syllabusId || "").toUpperCase() === String(filters.subjectId || "").toUpperCase()
    );
    return (selectedSubject?.topics || []).map((t) => String(t.topicName || "").toUpperCase()).filter(Boolean);
  }, [subjects, filters.subjectId]);

  const filterSubTopicOptions = useMemo(() => {
    const selectedSubject = subjects.find(
      (s) => String(s.syllabusId || "").toUpperCase() === String(filters.subjectId || "").toUpperCase()
    );
    const selectedTopic = (selectedSubject?.topics || []).find(
      (t) => String(t.topicName || "").toUpperCase() === String(filters.topicName || "").toUpperCase()
    );
    return (selectedTopic?.subTopics || []).map((s) => String(s || "").toUpperCase()).filter(Boolean);
  }, [subjects, filters.subjectId, filters.topicName]);

  const modalTopicOptions = useMemo(() => {
    const selectedSubject = subjects.find(
      (s) => String(s.syllabusId || "").toUpperCase() === String(baseForm.subjectId || "").toUpperCase()
    );
    return (selectedSubject?.topics || []).map((t) => String(t.topicName || "").toUpperCase()).filter(Boolean);
  }, [subjects, baseForm.subjectId]);

  const modalSubTopicOptions = useMemo(() => {
    const selectedSubject = subjects.find(
      (s) => String(s.syllabusId || "").toUpperCase() === String(baseForm.subjectId || "").toUpperCase()
    );
    const selectedTopic = (selectedSubject?.topics || []).find(
      (t) => String(t.topicName || "").toUpperCase() === String(baseForm.topicName || "").toUpperCase()
    );
    return (selectedTopic?.subTopics || []).map((s) => String(s || "").toUpperCase()).filter(Boolean);
  }, [subjects, baseForm.subjectId, baseForm.topicName]);

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
      if (filters.topicName) params.set("topicName", filters.topicName);
      if (filters.subTopicName) params.set("subTopicName", filters.subTopicName);
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
  }, [filters.examMasterId, filters.examCategoryId, filters.examStage, filters.subjectId, filters.topicName, filters.subTopicName, filters.status, pagination.page, pagination.limit]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchRows();
  };

  const openAddModal = async () => {
    try {
      const idRes = await axios.get("/master/question-bank/next-id");
      setEditId("");
      setDraftQuestions([]);
      setBaseForm({ examMasterId: "", examCategoryId: "", examStage: "", subjectId: "", topicName: "", subTopicName: "" });
      setQuestionForm({ ...emptyQuestion, questionBankId: idRes.data?.nextId || "QSBANK1" });
      setIsModalOpen(true);
    } catch {
      toastErrorOnce("FAILED TO GENERATE ID");
    }
  };

  const handleEdit = (row) => {
    setEditId(row._id);
    setDraftQuestions([]);
    setBaseForm({ examMasterId: row.examMasterId || "", examCategoryId: row.examCategoryId || "", examStage: row.examStage || "", subjectId: row.subjectId || "", topicName: row.topicName || "", subTopicName: row.subTopicName || "" });
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
      questionImages: Array.isArray(row.questionImages) ? row.questionImages : [],
      optionImages: row.optionImages || { A: [], B: [], C: [], D: [] },
      explanationImages: Array.isArray(row.explanationImages) ? row.explanationImages : [],
      status: row.status || "ACTIVE",
    });
    setIsModalOpen(true);
  };

  const validateQuestion = (q) => {
    if (!String(q.questionText || "").trim()) return "ENTER QUESTION";
    if (!String(q.optionA || "").trim() || !String(q.optionB || "").trim() || !String(q.optionC || "").trim() || !String(q.optionD || "").trim()) return "ENTER ALL OPTIONS";
    return "";
  };

  const readFilesAsDataUrls = (fileList) => {
    const files = Array.from(fileList || []);
    return Promise.all(
      files.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("FILE_READ_FAILED"));
            reader.readAsDataURL(file);
          })
      )
    );
  };

  const appendImages = async (field, fileList, optionKey) => {
    if (!fileList || fileList.length === 0) return;
    try {
      const images = await readFilesAsDataUrls(fileList);
      setQuestionForm((prev) => {
        if (field === "optionImages") {
          const nextOption = { ...(prev.optionImages || {}) };
          nextOption[optionKey] = [ ...(nextOption[optionKey] || []), ...images ];
          return { ...prev, optionImages: nextOption };
        }
        return { ...prev, [field]: [ ...(prev[field] || []), ...images ] };
      });
    } catch {
      toastErrorOnce("IMAGE LOAD FAILED");
    }
  };

  const removeImage = (field, index, optionKey) => {
    setQuestionForm((prev) => {
      if (field === "optionImages") {
        const nextOption = { ...(prev.optionImages || {}) };
        nextOption[optionKey] = (nextOption[optionKey] || []).filter((_, i) => i !== index);
        return { ...prev, optionImages: nextOption };
      }
      return { ...prev, [field]: (prev[field] || []).filter((_, i) => i !== index) };
    });
  };

  const insertSymbol = (symbol) => {
    const fieldKey = activeField || "questionText";
    const input = fieldRefs.current[fieldKey];
    if (!input) {
      setQuestionForm((prev) => ({ ...prev, [fieldKey]: `${prev[fieldKey] || ""}${symbol}` }));
      return;
    }
    const start = input.selectionStart ?? String(questionForm[fieldKey] || "").length;
    const end = input.selectionEnd ?? start;
    setQuestionForm((prev) => {
      const value = String(prev[fieldKey] || "");
      const nextValue = `${value.slice(0, start)}${symbol}${value.slice(end)}`;
      return { ...prev, [fieldKey]: nextValue };
    });
    setTimeout(() => {
      input.focus();
      const pos = start + symbol.length;
      if (input.setSelectionRange) input.setSelectionRange(pos, pos);
    }, 0);
  };

  const addDraftQuestion = () => {
    if (!baseForm.examMasterId || !baseForm.subjectId) return toastErrorOnce("SELECT EXAM, SUBJECT");
    if (modalNeedsCategory && !baseForm.examCategoryId) return toastErrorOnce("SELECT CATEGORY");
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
    if (!baseForm.examMasterId || !baseForm.subjectId) return toastErrorOnce("SELECT EXAM, SUBJECT");
    if (modalNeedsCategory && !baseForm.examCategoryId) return toastErrorOnce("SELECT CATEGORY");

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

          <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
            <select value={filters.examMasterId} onChange={(e) => { setFilters((prev) => ({ ...prev, examMasterId: e.target.value, examCategoryId: "", examStage: "", subjectId: "", topicName: "", subTopicName: "" })); setPagination((prev) => ({ ...prev, page: 1 })); }} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold">
              <option value="">All Exams</option>
              {exams.map((ex) => <option key={ex.examCode} value={ex.examCode}>{ex.examName}</option>)}
            </select>
            {filterNeedsCategory && <select value={filters.examCategoryId} onChange={(e) => { const categoryId = e.target.value; setFilters((prev) => ({ ...prev, examCategoryId: categoryId, examStage: "", subjectId: "", topicName: "", subTopicName: "" })); setPagination((prev) => ({ ...prev, page: 1 })); }} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold">
              <option value="">All Categories</option>
              {filteredCategories.map((cat) => <option key={cat.catId} value={cat.catId}>{cat.catName}</option>)}
            </select>}
            {filterNeedsStage && (
              <select value={filters.examStage} onChange={(e) => { setFilters((prev) => ({ ...prev, examStage: e.target.value, subjectId: "", topicName: "", subTopicName: "" })); setPagination((prev) => ({ ...prev, page: 1 })); }} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold">
                <option value="">All Stages</option>
                {filterStageOptions.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
              </select>
            )}
            <select value={filters.subjectId} onChange={(e) => { setFilters((prev) => ({ ...prev, subjectId: e.target.value, topicName: "", subTopicName: "" })); setPagination((prev) => ({ ...prev, page: 1 })); }} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold">
              <option value="">All Subjects</option>
              {filteredSubjects.map((sub) => <option key={sub.syllabusId} value={sub.syllabusId}>{sub.subjectName}</option>)}
            </select>
            <select value={filters.topicName} onChange={(e) => { setFilters((prev) => ({ ...prev, topicName: e.target.value, subTopicName: "" })); setPagination((prev) => ({ ...prev, page: 1 })); }} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold">
              <option value="">All Topics</option>
              {filterTopicOptions.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
            </select>
            <select value={filters.subTopicName} onChange={(e) => { setFilters((prev) => ({ ...prev, subTopicName: e.target.value })); setPagination((prev) => ({ ...prev, page: 1 })); }} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold">
              <option value="">All SubTopics</option>
              {filterSubTopicOptions.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
            </select>
            <select value={filters.status} onChange={(e) => { setFilters((prev) => ({ ...prev, status: e.target.value })); setPagination((prev) => ({ ...prev, page: 1 })); }} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold">
              <option value="">All Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
            <select value={pagination.page} onChange={(e) => setPagination((prev) => ({ ...prev, page: Number(e.target.value) }))} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => <option key={p} value={p}>Page {p}</option>)}
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="w-full pl-11 pr-28 py-2 border border-slate-200 rounded-xl text-sm font-semibold" placeholder="Search question, ID, subject..." />
            <button onClick={handleSearch} className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 text-xs bg-slate-900 text-white rounded-lg">Search</button>
          </div>
        </div>
      </header>

      <section className="bg-white rounded-[10px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="bg-[#0F172A] text-white text-[11px] font-semibold"><th className="p-2">Q.ID</th><th className="p-2">Exam</th>{hasStageInRows && <th className="p-2">Stage</th>}<th className="p-2">Category</th><th className="p-2">Subject</th>{hasTopicInRows && <th className="p-2">Topic</th>}{hasTopicInRows && <th className="p-2">SubTopic</th>}<th className="p-2">Marks</th><th className="p-2">Negative</th><th className="p-2">Status</th><th className="p-2 text-center">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-50">
              {loading ? <tr><td colSpan={(hasStageInRows ? 1 : 0) + (hasTopicInRows ? 2 : 0) + 8} className="p-20 text-center text-slate-300 font-semibold">Loading...</td></tr> : rows.length > 0 ? rows.map((row) => (
                <tr key={row._id} className="hover:bg-blue-50/30">
                  <td className="p-2 text-blue-600 text-sm font-semibold">{row.questionBankId}</td><td className="p-2 text-xs font-semibold">{row.examName}</td>{hasStageInRows && <td className="p-2 text-xs font-semibold">{row.examStage || "---"}</td>}<td className="p-2 text-xs font-semibold">{row.categoryName}</td><td className="p-2 text-xs font-semibold">{row.subjectName}</td>{hasTopicInRows && <td className="p-2 text-xs font-semibold">{row.topicName || "---"}</td>}{hasTopicInRows && <td className="p-2 text-xs font-semibold">{row.subTopicName || "---"}</td>}<td className="p-2 text-xs font-semibold">{row.marks}</td><td className="p-2 text-xs font-semibold">{row.negativeMarks}</td><td className="p-2 text-xs font-semibold">{row.status}</td>
                  <td className="p-2 flex justify-center gap-2"><button onClick={() => handleEdit(row)} className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Edit size={16} /></button><button onClick={() => handleDelete(row._id)} className="p-2 bg-red-50 text-red-400 rounded-xl"><Trash2 size={16} /></button></td>
                </tr>
              )) : <tr><td colSpan={(hasStageInRows ? 1 : 0) + (hasTopicInRows ? 2 : 0) + 8} className="p-20 text-center text-slate-300 font-semibold">No Records</td></tr>}
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
              <div><label className="text-sm font-semibold block mb-1">Exam</label><select required value={baseForm.examMasterId} onChange={(e) => setBaseForm({ ...baseForm, examMasterId: e.target.value, examCategoryId: "", examStage: "", subjectId: "", topicName: "", subTopicName: "" })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold"><option value="">-- Select Exam --</option>{exams.map((ex) => <option key={ex.examCode} value={ex.examCode}>{ex.examName}</option>)}</select></div>
              {modalNeedsCategory && <div><label className="text-sm font-semibold block mb-1">Category</label><select required value={baseForm.examCategoryId} onChange={(e) => { const categoryId = e.target.value; setBaseForm({ ...baseForm, examCategoryId: categoryId, examStage: "", subjectId: "", topicName: "", subTopicName: "" }); }} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold"><option value="">-- Select Category --</option>{modalFilteredCategories.map((cat) => <option key={cat.catId} value={cat.catId}>{cat.catName}</option>)}</select></div>}
              {modalNeedsStage && <div><label className="text-sm font-semibold block mb-1">Exam Stage</label><select value={baseForm.examStage} onChange={(e) => setBaseForm({ ...baseForm, examStage: e.target.value, subjectId: "", topicName: "", subTopicName: "" })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold"><option value="">-- Select Stage --</option>{modalStageOptions.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></div>}
              <div><label className="text-sm font-semibold block mb-1">Subject</label><select required value={baseForm.subjectId} onChange={(e) => setBaseForm({ ...baseForm, subjectId: e.target.value, topicName: "", subTopicName: "" })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold"><option value="">-- Select Subject --</option>{modalFilteredSubjects.map((sub) => <option key={sub.syllabusId} value={sub.syllabusId}>{sub.subjectName}</option>)}</select></div>
              <div><label className="text-sm font-semibold block mb-1">Topic</label><select value={baseForm.topicName} onChange={(e) => setBaseForm({ ...baseForm, topicName: e.target.value, subTopicName: "" })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold"><option value="">-- Select Topic --</option>{modalTopicOptions.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</select></div>
              <div><label className="text-sm font-semibold block mb-1">SubTopic</label><select value={baseForm.subTopicName} onChange={(e) => setBaseForm({ ...baseForm, subTopicName: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold"><option value="">-- Select SubTopic --</option>{modalSubTopicOptions.map((sub) => <option key={sub} value={sub}>{sub}</option>)}</select></div>
            </div>
            <div className="mt-5 border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-sm font-semibold block mb-1">Question ID</label><div className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-blue-600">{questionForm.questionBankId || "..."}</div></div>
                <div><label className="text-sm font-semibold block mb-1">Marks / Question</label><input type="number" min="0" step="0.5" value={questionForm.marks} onChange={(e) => setQuestionForm({ ...questionForm, marks: Number(e.target.value) })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold" /></div>
                <div><label className="text-sm font-semibold block mb-1">Negative Marks</label><input type="number" min="0" step="0.25" value={questionForm.negativeMarks} onChange={(e) => setQuestionForm({ ...questionForm, negativeMarks: Number(e.target.value) })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold" /></div>
              </div>
           <div className="space-y-2">
            {/* Toggle Button with Arrow */}
            <button
              type="button"
              onClick={() => setShowSymbols(!showSymbols)}
              className="flex items-center gap-2 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-xl transition-all border border-sky-200"
            >
              <div className={`transition-transform duration-200 ${showSymbols ? "rotate-90" : ""}`}>
                <ChevronRight size={14} strokeWidth={3} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">
                {showSymbols ? "Hide Symbols" : "Show Symbols"}
              </span>
            </button>

            {/* Collapsible Section */}
            {showSymbols && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-sky-200 bg-white p-3 shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
                <div className="w-full mb-1">
                  <span className="text-[10px] font-black uppercase text-sky-600 tracking-tight">
                    Inserting to: <span className="text-slate-900">{fieldLabels[activeField] || "Question"}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {symbolPalette.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => insertSymbol(sym)}
                      className="px-2.5 py-1 text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg hover:bg-sky-600 hover:text-white hover:border-sky-600 transition-all shadow-sm active:scale-90"
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

              <textarea
                ref={(el) => { fieldRefs.current.questionText = el; }}
                onFocus={() => setActiveField("questionText")}
                value={questionForm.questionText}
                onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold"
                placeholder="Question"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold block mb-1">Question Images</label>
                  <input type="file" accept="image/*" multiple onChange={(e) => appendImages("questionImages", e.target.files)} className="w-full p-2 border border-slate-200 rounded-xl text-sm" />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(questionForm.questionImages || []).map((img, idx) => (
                      <div key={`qimg-${idx}`} className="relative w-16 h-16 border border-slate-200 rounded-lg overflow-hidden">
                        <img src={img} alt="question" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeImage("questionImages", idx)} className="absolute top-1 right-1 bg-white/90 rounded-full p-1">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  ref={(el) => { fieldRefs.current.optionA = el; }}
                  onFocus={() => setActiveField("optionA")}
                  value={questionForm.optionA}
                  onChange={(e) => setQuestionForm({ ...questionForm, optionA: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold"
                  placeholder="Option A"
                />
                <input
                  ref={(el) => { fieldRefs.current.optionB = el; }}
                  onFocus={() => setActiveField("optionB")}
                  value={questionForm.optionB}
                  onChange={(e) => setQuestionForm({ ...questionForm, optionB: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold"
                  placeholder="Option B"
                />
                <input
                  ref={(el) => { fieldRefs.current.optionC = el; }}
                  onFocus={() => setActiveField("optionC")}
                  value={questionForm.optionC}
                  onChange={(e) => setQuestionForm({ ...questionForm, optionC: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold"
                  placeholder="Option C"
                />
                <input
                  ref={(el) => { fieldRefs.current.optionD = el; }}
                  onFocus={() => setActiveField("optionD")}
                  value={questionForm.optionD}
                  onChange={(e) => setQuestionForm({ ...questionForm, optionD: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold"
                  placeholder="Option D"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["A", "B", "C", "D"].map((opt) => (
                  <div key={`optimg-${opt}`}>
                    <label className="text-sm font-semibold block mb-1">Option {opt} Images</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => appendImages("optionImages", e.target.files, opt)}
                      className="w-full p-2 border border-slate-200 rounded-xl text-sm"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(questionForm.optionImages?.[opt] || []).map((img, idx) => (
                        <div key={`opt-${opt}-${idx}`} className="relative w-16 h-16 border border-slate-200 rounded-lg overflow-hidden">
                          <img src={img} alt={`option-${opt}`} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeImage("optionImages", idx, opt)} className="absolute top-1 right-1 bg-white/90 rounded-full p-1">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select value={questionForm.correctOption} onChange={(e) => setQuestionForm({ ...questionForm, correctOption: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select>
                <select value={questionForm.status} onChange={(e) => setQuestionForm({ ...questionForm, status: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold"><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select>
              </div>
              <textarea
                ref={(el) => { fieldRefs.current.explanationText = el; }}
                onFocus={() => setActiveField("explanationText")}
                value={questionForm.explanationText}
                onChange={(e) => setQuestionForm({ ...questionForm, explanationText: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold"
                placeholder="Explanation"
              />
              <div>
                <label className="text-sm font-semibold block mb-1">Explanation Images</label>
                <input type="file" accept="image/*" multiple onChange={(e) => appendImages("explanationImages", e.target.files)} className="w-full p-2 border border-slate-200 rounded-xl text-sm" />
                <div className="mt-2 flex flex-wrap gap-2">
                  {(questionForm.explanationImages || []).map((img, idx) => (
                    <div key={`eimg-${idx}`} className="relative w-16 h-16 border border-slate-200 rounded-lg overflow-hidden">
                      <img src={img} alt="explanation" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage("explanationImages", idx)} className="absolute top-1 right-1 bg-white/90 rounded-full p-1">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {!editId && <button type="button" onClick={addDraftQuestion} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">Add In Draft List</button>}
            </div>
            {!editId && (
              <div className="mt-5 space-y-2">
                {draftQuestions.map((q, idx) => (
                  <div key={`${q.questionBankId}-${idx}`} className="bg-white border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-3">
                    <div><p className="text-sm font-semibold text-blue-700">{q.questionBankId}</p><p className="text-sm font-semibold text-slate-800">{q.questionText}</p></div>
                    <div className="flex gap-2"><button type="button" onClick={() => { setQuestionForm({ ...q }); setDraftQuestions((prev) => prev.filter((_, i) => i !== idx)); }} className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Edit size={15} /></button><button type="button" onClick={() => setDraftQuestions((prev) => prev.filter((_, i) => i !== idx))} className="p-2 bg-red-50 text-red-500 rounded-xl"><Trash2 size={15} /></button></div>
                  </div>
                ))}
              </div>
            )}
            <button disabled={isSaving} className="w-full py-4 mt-6 bg-[#0F172A] text-white rounded-2xl hover:bg-blue-600 flex justify-center items-center gap-3 text-sm font-semibold">{isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}{editId ? "Update Question" : "Final Submit All Draft"}</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
