import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, Eye, Loader2, Plus, RefreshCw, Save, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import axios from "../api/axios";

const toastErrorOnce = (msg) => toast.error(msg, { id: "one-error" });
const toastOkOnce = (msg) => toast.success(msg, { id: "one-success" });

const emptyQuestion = {
  marks: "",
  negativeMarks: "",
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "",
  explanationText: "",
  questionImages: [],
  optionImages: { A: [], B: [], C: [], D: [] },
  explanationImages: [],
};

const isNoCategoryValue = (value) => {
  const v = String(value || "").trim().toUpperCase();
  return !v || v === "NO CATEGORY" || v === "NO_CATEGORY" || v === "NONE";
};

// SECTION 1: PASTE THIS AT THE TOP (OUTSIDE QuestionBank)
const MathField = ({ fieldKey, label = "", value, onChange, onPaste, onFocus, inputRef, placeholder = "", rows = 3, className = "" }) => (
  <div className={`space-y-2 ${className}`}>
    {label ? <label className="text-sm font-semibold block text-slate-700">{label}</label> : null}
    <textarea
      ref={inputRef}
      onFocus={onFocus}
      value={value}
      onPaste={onPaste}
      onChange={(e) => onChange(e.target.value)}
      dir="ltr"
      rows={rows}
      className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold bg-white outline-none focus:ring-2 focus:ring-sky-200 resize-y text-left"
      placeholder={placeholder}
    />
    {/* Paragraph structure for the preview box */}
    <div className="min-h-[44px] p-3 border border-blue-50 bg-blue-50/30 rounded-xl text-sm text-slate-800 whitespace-normal break-words leading-relaxed text-left">
      {value || <span className="text-slate-400 italic">Preview...</span>}
    </div>
  </div>
);
const QuestionBank = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [symbolField, setSymbolField] = useState("");
  const [questionSetId, setQuestionSetId] = useState("");
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
  const [baseForm, setBaseForm] = useState({ examMasterId: "", examCategoryId: "", examStage: "", subjectId: "", topicName: "", subTopicName: "", status: "ACTIVE" });
  const [questionForm, setQuestionForm] = useState({ ...emptyQuestion });
  const [draftQuestions, setDraftQuestions] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewSet, setViewSet] = useState(null);
  const [activeField, setActiveField] = useState("questionText");
  const fieldRefs = useRef({});
  const formMathRef = useRef(null);
  const viewMathRef = useRef(null);
  const typesetTimerRef = useRef(null);


const handlePasteCleaning = (e, currentValue, setter) => {
  e.preventDefault();
  const pastedData = e.clipboardData.getData('text');
  
  const cleanedData = pastedData
    .replace(/\\\[/g, '$$$') 
    .replace(/\\\]/g, '$$$') 
    .replace(/\\\(/g, '$')   
    .replace(/\\\)/g, '$')   
    // This joins lines that are broken by single enters (the "Small Line" fix)
    .replace(/([^\n])\n([^\n])/g, '$1 $2') 
    // This keeps double enters for real paragraphs
    .replace(/\n\s*\n/g, '\n\n') 
    .trim();

  const start = e.target.selectionStart;
  const end = e.target.selectionEnd;
  setter(currentValue.substring(0, start) + cleanedData + currentValue.substring(end));
};

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
      toastErrorOnce("FAILED TO LOAD QUESTION SETS");
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
      setBaseForm({ examMasterId: "", examCategoryId: "", examStage: "", subjectId: "", topicName: "", subTopicName: "", status: "ACTIVE" });
      setQuestionSetId(idRes.data?.nextId || "QSET0");
      setQuestionForm({ ...emptyQuestion });
      setIsModalOpen(true);
    } catch {
      toastErrorOnce("FAILED TO GENERATE ID");
    }
  };

const handleEdit = async (rowId) => {
    try {
      const res = await axios.get(`/master/question-bank/${rowId}`);
      const row = res.data?.data;
      if (!row) return;
      setShowViewModal(false);
      setEditId(row._id);
      setQuestionSetId(row.questionSetId || "");
      setDraftQuestions(Array.isArray(row.questions) ? row.questions : []);
      setBaseForm({
        examMasterId: row.examMasterId || "",
        examCategoryId: row.examCategoryId || "",
        examStage: row.examStage || "",
        subjectId: row.subjectId || "",
        topicName: row.topicName || "",
        subTopicName: row.subTopicName || "",
        status: row.status || "ACTIVE",
      });
      setQuestionForm({ ...emptyQuestion });
      setIsModalOpen(true);

      // --- ADD THIS SECTION HERE ---
      // This forces the "Real Data" to show instead of LaTeX when the modal opens
      setTimeout(() => {
        typesetMath(formMathRef.current);
      }, 500); 
      // -----------------------------

    } catch {
      toastErrorOnce("FAILED TO LOAD QUESTION SET");
    }
  };

  const handleView = async (rowId) => {
    try {
      const res = await axios.get(`/master/question-bank/${rowId}`);
      const row = res.data?.data;
      if (!row) return;
      setViewSet(row);
      setShowViewModal(true);
    } catch {
      toastErrorOnce("FAILED TO LOAD QUESTION SET");
    }
  };

  const validateQuestion = () => "";

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

  const insertTextAtCursor = (fieldKey, text) => {
    const input = fieldRefs.current[fieldKey];
    if (!input) {
      setQuestionForm((prev) => ({ ...prev, [fieldKey]: `${prev[fieldKey] || ""}${text}` }));
      return;
    }
    const start = input.selectionStart ?? String(questionForm[fieldKey] || "").length;
    const end = input.selectionEnd ?? start;
    setQuestionForm((prev) => {
      const value = String(prev[fieldKey] || "");
      const nextValue = `${value.slice(0, start)}${text}${value.slice(end)}`;
      return { ...prev, [fieldKey]: nextValue };
    });
    setTimeout(() => {
      input.focus();
      const pos = start + text.length;
      if (input.setSelectionRange) input.setSelectionRange(pos, pos);
    }, 0);
  };

  const insertSymbol = (symbol, fieldKey = activeField || "questionText") => {
    insertTextAtCursor(fieldKey, symbol);
  };

  const typesetMath = (root) => {
    if (!root) return;
    if (!window.MathJax || !window.MathJax.typesetPromise) {
      setTimeout(() => typesetMath(root), 200);
      return;
    }
    if (window.MathJax.typesetClear) window.MathJax.typesetClear([root]);
    window.MathJax.typesetPromise([root]);
  };

  useEffect(() => {
    clearTimeout(typesetTimerRef.current);
    typesetTimerRef.current = setTimeout(() => {
      typesetMath(formMathRef.current);
      if (document.activeElement === document.body && activeField) {
        const el = fieldRefs.current[activeField];
        if (el) el.focus();
      }
    }, 180);
  }, [questionForm.questionText, questionForm.explanationText, questionForm.optionA, questionForm.optionB, questionForm.optionC, questionForm.optionD, activeField]);

  useEffect(() => {
    if (showViewModal) typesetMath(viewMathRef.current);
  }, [showViewModal, viewSet]);


  const renderSymbolPicker = (fieldKey) => (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setSymbolField((prev) => (prev === fieldKey ? "" : fieldKey))}
        className="flex items-center gap-2 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-xl transition-all border border-sky-200"
      >
        <span className="text-[10px] font-black uppercase tracking-widest">
          {symbolField === fieldKey ? "Hide Symbols" : "Symbols"}
        </span>
      </button>

      {symbolField === fieldKey && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-sky-200 bg-white p-1 shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
          <div className="w-full mb-1">
            <span className="text-[10px] font-black uppercase text-sky-600 tracking-tight">
              Inserting to: <span className="text-slate-900">{fieldLabels[fieldKey] || "Question"}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {symbolPalette.map((sym, idx) => (
              <button
                key={`${fieldKey}-${idx}`}
                type="button"
                onClick={() => insertSymbol(sym, fieldKey)}
                className="px-2.5 py-1 text-xs font-bold bg-slate-50 border border-slate-200 text-slate-800 rounded-lg hover:bg-sky-600 hover:text-white hover:border-sky-600 transition-all shadow-sm active:scale-90"
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const stripHtml = (html) =>
    String(html || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

const addDraftQuestion = () => {
  if (!questionForm.questionText) return toastErrorOnce("Question text is required");

  // Forces marks and negative marks into the object being saved
  const finalQuestion = { 
    ...questionForm, 
    marks: questionForm.marks || "0", 
    negativeMarks: questionForm.negativeMarks || "0" 
  };

  setDraftQuestions((prev) => [...prev, finalQuestion]);
  
  setQuestionForm((prev) => ({
    ...emptyQuestion,
    marks: prev.marks,
    negativeMarks: prev.negativeMarks,
  }));
};

  const saveBatch = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await axios.post("/master/question-bank/upsert", {
        questionSetId,
        ...baseForm,
        questions: draftQuestions,
      });
      toastOkOnce("QUESTION SET SAVED");
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
    if (editId) {
      const err = validateQuestion(questionForm);
      if (err) return toastErrorOnce(err);
      setIsSaving(true);
      try {
        await axios.post("/master/question-bank/upsert", {
          id: editId,
          questionSetId,
          ...baseForm,
          questions: draftQuestions,
        });
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
            <h1 className="text-lg font-semibold text-slate-900">Question Sets</h1>
            <div className="flex items-center gap-3">
              <button onClick={fetchRows} className="p-2 bg-slate-50 text-slate-900 rounded-2xl border border-slate-100"><RefreshCw size={20} className={loading ? "animate-spin" : ""} /></button>
              <button onClick={() => navigate("/dashboard/question-bank/new")} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl text-xs shadow-lg"><Plus size={14} strokeWidth={3} />Add Question Set</button>
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
            <thead><tr className="bg-[#0F172A] text-white text-[11px] font-semibold"><th className="p-2">Set ID</th><th className="p-2">Exam</th>{hasStageInRows && <th className="p-2">Stage</th>}<th className="p-2">Category</th><th className="p-2">Subject</th>{hasTopicInRows && <th className="p-2">Topic</th>}{hasTopicInRows && <th className="p-2">SubTopic</th>}<th className="p-2">Questions</th><th className="p-2">Status</th><th className="p-2 text-center">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <tr><td colSpan={(hasStageInRows ? 1 : 0) + (hasTopicInRows ? 2 : 0) + 7} className="p-20 text-center text-slate-300 font-semibold">Loading...</td></tr> : rows.length > 0 ? rows.map((row) => (
                <tr key={row._id} className="hover:bg-blue-50/30">
                  <td className="p-2 text-blue-600 text-sm font-semibold">{row.questionSetId}</td><td className="p-2 text-xs font-semibold">{row.examName}</td>{hasStageInRows && <td className="p-2 text-xs font-semibold">{row.examStage || "---"}</td>}<td className="p-2 text-xs font-semibold">{row.categoryName}</td><td className="p-2 text-xs font-semibold">{row.subjectName}</td>{hasTopicInRows && <td className="p-2 text-xs font-semibold">{row.topicName || "---"}</td>}{hasTopicInRows && <td className="p-2 text-xs font-semibold">{row.subTopicName || "---"}</td>}<td className="p-2 text-xs font-semibold">{Array.isArray(row.questions) ? row.questions.length : 0}</td><td className="p-2 text-xs font-semibold">{row.status}</td>
                  <td className="p-2 flex justify-center gap-2"><button onClick={() => handleView(row._id)} className="p-2 bg-slate-100 text-slate-600 rounded-xl"><Eye size={16} /></button><button onClick={() => navigate(`/dashboard/question-bank/${row._id}/edit`)} className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Edit size={16} /></button><button onClick={() => handleDelete(row._id)} className="p-2 bg-red-50 text-red-400 rounded-xl"><Trash2 size={16} /></button></td>
                </tr>
              )) : <tr><td colSpan={(hasStageInRows ? 1 : 0) + (hasTopicInRows ? 2 : 0) + 7} className="p-20 text-center text-slate-300 font-semibold">No Records</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {showViewModal && viewSet && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setShowViewModal(false); setViewSet(null); }}></div>
          <div ref={viewMathRef} className="relative bg-white w-full max-w-5xl p-6 rounded-[24px] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Question Set View</h2>
                <p className="text-xs text-slate-500">Set ID: <span className="font-semibold text-blue-700">{viewSet.questionSetId}</span></p>
              </div>
              <button type="button" onClick={() => { setShowViewModal(false); setViewSet(null); }} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700 mb-4">
              <div><span className="font-semibold text-slate-800">Exam:</span> {viewSet.examName || "---"}</div>
              <div><span className="font-semibold text-slate-800">Category:</span> {viewSet.categoryName || "---"}</div>
              <div><span className="font-semibold text-slate-800">Subject:</span> {viewSet.subjectName || "---"}</div>
            </div>

            <div className="space-y-4">
              {(Array.isArray(viewSet.questions) ? viewSet.questions : []).map((q, idx) => (
                <div key={`view-q-${idx}`} className="border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="font-semibold text-slate-800">{q.qNo || `Q${idx + 1}`}</div>
                    <div>Marks: <span className="font-semibold text-slate-800">{q.marks ?? "--"}</span> | Neg: <span className="font-semibold text-slate-800">{q.negativeMarks ?? "--"}</span></div>
                  </div>

                  <div className="text-sm text-slate-800 whitespace-pre-wrap">{q.questionText || "---"}</div>

                  {(Array.isArray(q.questionImages) ? q.questionImages : []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {q.questionImages.map((img, i) => (
                        <img key={`vqimg-${idx}-${i}`} src={img} alt="question" className="h-24 w-24 object-cover rounded-lg border border-slate-200" />
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    {["A", "B", "C", "D"].map((opt) => (
                      <div key={`view-${idx}-${opt}`} className="rounded-xl border border-slate-100 p-3">
                        <div className="text-xs font-semibold text-slate-600 mb-1">Option {opt}</div>
                        <div className="text-sm text-slate-800 whitespace-pre-wrap">{q[`option${opt}`] || "---"}</div>
                        {(Array.isArray(q.optionImages?.[opt]) ? q.optionImages?.[opt] : []).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {q.optionImages[opt].map((img, i) => (
                              <img key={`vopt-${idx}-${opt}-${i}`} src={img} alt={`option-${opt}`} className="h-20 w-20 object-cover rounded-lg border border-slate-200" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="text-sm font-semibold text-emerald-700">
                    Correct Answer: <span className="text-slate-900">{q.correctOption || "--"}</span>
                  </div>

                  <div className="text-sm text-slate-800 whitespace-pre-wrap">
                    <div className="text-xs font-semibold text-slate-600 mb-1">Explanation</div>
                    {q.explanationText || "---"}
                  </div>

                  {(Array.isArray(q.explanationImages) ? q.explanationImages : []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {q.explanationImages.map((img, i) => (
                        <img key={`vexp-${idx}-${i}`} src={img} alt="explanation" className="h-24 w-24 object-cover rounded-lg border border-slate-200" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {(Array.isArray(viewSet.questions) ? viewSet.questions : []).length === 0 && (
                <div className="p-10 text-center text-slate-300 font-semibold">No questions in this set.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form ref={formMathRef} onSubmit={handleSubmit} dir="ltr" className="relative bg-white w-full max-w-6xl p-8 rounded-[30px] shadow-2xl max-h-[90vh] overflow-y-auto text-left">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-semibold">{editId ? "Update Question Set" : "Create Question Set"}</h2><button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="text-sm font-semibold block mb-1">Exam</label><select value={baseForm.examMasterId} onChange={(e) => setBaseForm({ ...baseForm, examMasterId: e.target.value, examCategoryId: "", examStage: "", subjectId: "", topicName: "", subTopicName: "" })} className="w-full p-1 border border-slate-200 rounded-xl text-sm font-semibold"><option value="">-- Select Exam --</option>{exams.map((ex) => <option key={ex.examCode} value={ex.examCode}>{ex.examName}</option>)}</select></div>
              {modalNeedsCategory && <div><label className="text-sm font-semibold block mb-1">Category</label><select value={baseForm.examCategoryId} onChange={(e) => { const categoryId = e.target.value; setBaseForm({ ...baseForm, examCategoryId: categoryId, examStage: "", subjectId: "", topicName: "", subTopicName: "" }); }} className="w-full p-1 border border-slate-200 rounded-xl text-sm font-semibold"><option value="">-- Select Category --</option>{modalFilteredCategories.map((cat) => <option key={cat.catId} value={cat.catId}>{cat.catName}</option>)}</select></div>}
              {modalNeedsStage && <div><label className="text-sm font-semibold block mb-1">Exam Stage</label><select value={baseForm.examStage} onChange={(e) => setBaseForm({ ...baseForm, examStage: e.target.value, subjectId: "", topicName: "", subTopicName: "" })} className="w-full p-1 border border-slate-200 rounded-xl text-sm font-semibold"><option value="">-- Select Stage --</option>{modalStageOptions.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></div>}
              <div><label className="text-sm font-semibold block mb-1">Subject</label><select value={baseForm.subjectId} onChange={(e) => setBaseForm({ ...baseForm, subjectId: e.target.value, topicName: "", subTopicName: "" })} className="w-full p-1 border border-slate-200 rounded-xl text-sm font-semibold"><option value="">-- Select Subject --</option>{modalFilteredSubjects.map((sub) => <option key={sub.syllabusId} value={sub.syllabusId}>{sub.subjectName}</option>)}</select></div>
              <div><label className="text-sm font-semibold block mb-1">Topic</label><select value={baseForm.topicName} onChange={(e) => setBaseForm({ ...baseForm, topicName: e.target.value, subTopicName: "" })} className="w-full p-1 border border-slate-200 rounded-xl text-sm font-semibold"><option value="">-- Select Topic --</option>{modalTopicOptions.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</select></div>
              <div><label className="text-sm font-semibold block mb-1">SubTopic</label><select value={baseForm.subTopicName} onChange={(e) => setBaseForm({ ...baseForm, subTopicName: e.target.value })} className="w-full p-1 border border-slate-200 rounded-xl text-sm font-semibold"><option value="">-- Select SubTopic --</option>{modalSubTopicOptions.map((sub) => <option key={sub} value={sub}>{sub}</option>)}</select></div>
              <div><label className="text-sm font-semibold block mb-1">Status</label><select value={baseForm.status} onChange={(e) => setBaseForm({ ...baseForm, status: e.target.value })} className="w-full p-1 border border-slate-200 rounded-xl text-sm font-semibold"><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></div>
            </div>
            <div className="mt-5 border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-sm font-semibold block mb-1">Question Set ID</label><div className="p-1 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-blue-600">{questionSetId || "..."}</div></div>
                <div><label className="text-sm font-semibold block mb-1">Marks / Question</label><input type="number" step="0.5" value={questionForm.marks} onChange={(e) => setQuestionForm((prev) => ({ ...prev, marks: e.target.value }))} className="w-full p-1 border border-slate-200 rounded-xl text-sm font-semibold" /></div>
                <div><label className="text-sm font-semibold block mb-1">Negative Marks</label><input type="number" step="0.25" value={questionForm.negativeMarks} onChange={(e) => setQuestionForm((prev) => ({ ...prev, negativeMarks: e.target.value }))} className="w-full p-1 border border-slate-200 rounded-xl text-sm font-semibold" /></div>
              </div>
              {renderSymbolPicker("questionText")}
              <MathField
                fieldKey="questionText"
                label="Question"
                value={questionForm.questionText}
                onChange={(v) => setQuestionForm((prev) => ({ ...prev, questionText: v }))}
                placeholder="Question"
                rows={5}
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-blue-900">Option A</label>
                  {renderSymbolPicker("optionA")}
                </div>
                <MathField
                  fieldKey="optionA"
                  value={questionForm.optionA}
                  onChange={(v) => setQuestionForm((prev) => ({ ...prev, optionA: v }))}
                  placeholder="Enter Option A"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-blue-900">Option B</label>
                  {renderSymbolPicker("optionB")}
                </div>
                <MathField
                  fieldKey="optionB"
                  value={questionForm.optionB}
                  onChange={(v) => setQuestionForm((prev) => ({ ...prev, optionB: v }))}
                  placeholder="Enter Option B"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-blue-900">Option C</label>
                  {renderSymbolPicker("optionC")}
                </div>
                <MathField
                  fieldKey="optionC"
                  value={questionForm.optionC}
                  onChange={(v) => setQuestionForm((prev) => ({ ...prev, optionC: v }))}
                  placeholder="Enter Option C"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-blue-900">Option D</label>
                  {renderSymbolPicker("optionD")}
                </div>
                <MathField
                  fieldKey="optionD"
                  value={questionForm.optionD}
                  onChange={(v) => setQuestionForm((prev) => ({ ...prev, optionD: v }))}
                  placeholder="Enter Option D"
                  rows={2}
                />
              </div>

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
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-blue-600">
                    Correct Option
                  </label>

                  <select
                    value={questionForm.correctOption}
                    onChange={(e) =>
                      setQuestionForm((prev) => ({ ...prev, correctOption: e.target.value }))
                    }
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold"
                  >
                    <option value="">-- Select --</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                {renderSymbolPicker("explanationText")}
              <MathField
                fieldKey="explanationText"
                label="Explanation"
                value={questionForm.explanationText}
                onChange={(v) => setQuestionForm((prev) => ({ ...prev, explanationText: v }))}
                placeholder="Explanation"
                rows={4}
              />
              </div>
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
              <button type="button" onClick={addDraftQuestion} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">Add In Draft List</button>
            </div>

        <div className="mt-5 border border-slate-200 rounded-2xl p-4 bg-white space-y-4 shadow-inner">
  <div className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2">Live Preview (Proper Structure)</div>
  
  <div className="space-y-3">
    {/* Question Paragraph Section */}
    <div className="text-sm text-slate-900 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
      <span className="font-bold text-slate-500 block text-[10px] uppercase mb-1">Question Text</span>
      <div className="whitespace-normal break-words leading-relaxed text-sm">
  {questionForm.questionText || "---"}
</div>
    </div>

    {/* Options Grid Section */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
      {["A", "B", "C", "D"].map((letter) => (
        <div key={letter} className="text-sm p-3 bg-white rounded-lg border border-slate-200 shadow-sm leading-relaxed">
          <span className="font-bold text-blue-700 mr-2">{letter}.</span>
          <span className="whitespace-pre-wrap">{questionForm[`option${letter}`] || "---"}</span>
        </div>
      ))}
    </div>

    {/* Metadata Section */}
    <div className="flex gap-4">
       <div className="text-sm text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
        CORRECT: {questionForm.correctOption || "NONE"}
      </div>
      <div className="text-sm text-blue-700 font-bold bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
        MARKS: {questionForm.marks || "0"}
      </div>
    </div>

    {/* Explanation Paragraph Section */}
    {questionForm.explanationText && (
      <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border-l-4 border-blue-400 leading-relaxed">
        <span className="font-bold text-slate-500 block text-[10px] uppercase mb-1">Explanation / Solution</span>
        <div className="whitespace-pre-wrap italic">{questionForm.explanationText}</div>
      </div>
    )}
  </div>
</div>
            <div className="mt-5 space-y-2">
              {draftQuestions.map((q, idx) => (
                <div key={`draft-${idx}`} className="bg-white border border-slate-200 rounded-xl p-1 flex items-start justify-between gap-3">
                  <div><p className="text-sm font-semibold text-blue-700">{`Q${idx + 1}`}</p><p className="text-sm font-semibold text-blue-900">{q.questionText || "---"}</p></div>
                  <div className="flex gap-2"><button type="button" onClick={() => { setQuestionForm((prev) => ({ ...prev, ...q })); setDraftQuestions((prev) => prev.filter((_, i) => i !== idx)); }} className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Edit size={15} /></button><button type="button" onClick={() => setDraftQuestions((prev) => prev.filter((_, i) => i !== idx))} className="p-2 bg-red-50 text-red-500 rounded-xl"><Trash2 size={15} /></button></div>
                </div>
              ))}
            </div>
            <button disabled={isSaving} className="w-full py-4 mt-6 bg-[#0F172A] text-white rounded-2xl hover:bg-blue-600 flex justify-center items-center gap-3 text-sm font-semibold">{isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}{editId ? "First add in Draft list then press this button for update" : "Save Question Set"}</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
