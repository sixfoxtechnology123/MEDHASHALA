import React, { useEffect, useMemo, useRef, useState } from "react";
import { Edit, Loader2, Save, Trash2, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
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
    <div className="min-h-[44px] p-3 border border-blue-50 bg-blue-50/30 rounded-xl text-sm text-slate-800 whitespace-normal break-words leading-relaxed text-left">
      {value || <span className="text-slate-400 italic">Preview...</span>}
    </div>
  </div>
);

const QuestionBankForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [symbolField, setSymbolField] = useState("");
  const [questionSetId, setQuestionSetId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editId, setEditId] = useState("");
  const [baseForm, setBaseForm] = useState({ examMasterId: "", examCategoryId: "", examStage: "", subjectId: "", topicName: "", subTopicName: "", status: "ACTIVE" });
  const [questionForm, setQuestionForm] = useState({ ...emptyQuestion });
  const [draftQuestions, setDraftQuestions] = useState([]);
  const [activeField, setActiveField] = useState("questionText");

  const fieldRefs = useRef({});
  const formMathRef = useRef(null);
  const typesetTimerRef = useRef(null);

  const handlePasteCleaning = (e, currentValue, setter) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");

    const cleanedData = pastedData
      .replace(/\\\[/g, "$$$")
      .replace(/\\\]/g, "$$$")
      .replace(/\\\(/g, "$")
      .replace(/\\\)/g, "$")
      .replace(/([^\n])\n([^\n])/g, "$1 $2")
      .replace(/\n\s*\n/g, "\n\n")
      .trim();

    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    setter(currentValue.substring(0, start) + cleanedData + currentValue.substring(end));
  };

  const symbolPalette = [
    "+", "−", "×", "÷", "=", "≠", "≈", "≡",
    "<", ">", "≤", "≥", "±", "∓",
    "√", "∛", "∜",
    "∑", "∏",
    "∫", "∬", "∭",
    "∂", "∇",
    "∞", "∝",
    "∠", "∟",
    "∈", "∉",
    "∅",
    "⊂", "⊃",
    "⊆", "⊇",
    "∪", "∩",
    "¬", "∧", "∨",
    "⇒", "⇔",
    "∀", "∃",
    "→", "←", "↑", "↓",
    "↔", "↕",
    "⇒", "⇐", "⇔",
    "α","β","γ","δ","ε","ζ","η","θ",
    "ι","κ","λ","μ","ν","ξ","ο","π",
    "ρ","σ","τ","υ","φ","χ","ψ","ω",
    "Α","Β","Γ","Δ","Ε","Ζ","Η","Θ",
    "Ι","Κ","Λ","Μ","Ν","Ξ","Ο","Π",
    "Ρ","Σ","Τ","Υ","Φ","Χ","Ψ","Ω",
    "Δ","λ","μ","ρ","σ","τ","ω",
    "ħ","ϕ","ϑ","ϱ",
    "°", "℃", "℉",
    "Å", "Å",
    "mol", "Na", "Cl",
    "m","cm","mm",
    "kg","g",
    "s","ms",
    "A","V","W","J","N","Pa","Hz",
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
  const modalNeedsStage = useMemo(() => modalNeedsCategory && modalStageOptions.length > 0, [modalNeedsCategory, modalStageOptions]);

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

  const initNew = async () => {
    try {
      const idRes = await axios.get("/master/question-bank/next-id");
      setEditId("");
      setDraftQuestions([]);
      setBaseForm({ examMasterId: "", examCategoryId: "", examStage: "", subjectId: "", topicName: "", subTopicName: "", status: "ACTIVE" });
      setQuestionSetId(idRes.data?.nextId || "QSET0");
      setQuestionForm({ ...emptyQuestion });
    } catch {
      toastErrorOnce("FAILED TO GENERATE ID");
    }
  };

  const loadEdit = async (rowId) => {
    try {
      const res = await axios.get(`/master/question-bank/${rowId}`);
      const row = res.data?.data;
      if (!row) return;
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

      setTimeout(() => {
        typesetMath(formMathRef.current);
      }, 500);
    } catch {
      toastErrorOnce("FAILED TO LOAD QUESTION SET");
    }
  };

  useEffect(() => { fetchMasters(); }, []);
  useEffect(() => {
    if (isEdit) {
      loadEdit(id);
    } else {
      initNew();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const addDraftQuestion = () => {
    if (!questionForm.questionText) return toastErrorOnce("Question text is required");

    const finalQuestion = {
      ...questionForm,
      marks: questionForm.marks || "0",
      negativeMarks: questionForm.negativeMarks || "0",
    };

    setDraftQuestions((prev) => [...prev, finalQuestion]);

    setQuestionForm((prev) => ({
      ...emptyQuestion,
      marks: prev.marks,
      negativeMarks: prev.negativeMarks,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    const questionsToSave = draftQuestions.length
      ? draftQuestions
      : (questionForm.questionText ? [questionForm] : []);

    if (!questionsToSave.length) return toastErrorOnce("ADD AT LEAST ONE QUESTION");

    setIsSaving(true);
    try {
      await axios.post("/master/question-bank/upsert", {
        id: editId || undefined,
        questionSetId,
        ...baseForm,
        questions: questionsToSave,
      });
      toastOkOnce(editId ? "UPDATED" : "QUESTION SET SAVED");
      navigate("/dashboard/question-bank");
    } catch (err) {
      toastErrorOnce(err?.response?.data?.message || (editId ? "UPDATE FAILED" : "SAVE FAILED"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F7FF]">
      <header className="p-2 space-y-2">
        <div className="bg-white px-4 py-3 rounded-[24px] border border-slate-200 shadow-sm flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{isEdit ? "Update Question Set" : "Create Question Set"}</h1>
            <p className="text-xs text-slate-500">Set ID: <span className="font-semibold text-blue-700">{questionSetId || "--"}</span></p>
          </div>
          <button type="button" onClick={() => navigate("/dashboard/question-bank")} className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-700">Back</button>
        </div>
      </header>

      <section className="px-3 pb-6">
        <form ref={formMathRef} onSubmit={handleSubmit} dir="ltr" className="bg-white w-full p-6 rounded-[24px] border border-slate-200 shadow-sm text-left">
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

          <div className="mt-5 space-y-2">
            {draftQuestions.map((q, idx) => (
              <div key={`draft-${idx}`} className="bg-white border border-slate-200 rounded-xl p-1 flex items-start justify-between gap-3">
                <div><p className="text-sm font-semibold text-blue-700">{`Q${idx + 1}`}</p><p className="text-sm font-semibold text-blue-900">{q.questionText || "---"}</p></div>
                <div className="flex gap-2"><button type="button" onClick={() => { setQuestionForm((prev) => ({ ...prev, ...q })); setDraftQuestions((prev) => prev.filter((_, i) => i !== idx)); }} className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Edit size={15} /></button><button type="button" onClick={() => setDraftQuestions((prev) => prev.filter((_, i) => i !== idx))} className="p-2 bg-red-50 text-red-500 rounded-xl"><Trash2 size={15} /></button></div>
              </div>
            ))}
          </div>

          <button disabled={isSaving} className="w-full py-4 mt-6 bg-[#0F172A] text-white rounded-2xl hover:bg-blue-600 flex justify-center items-center gap-3 text-sm font-semibold">
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {editId ? "Update Question Set" : "Save Question Set"}
          </button>
        </form>
      </section>
    </div>
  );
};

export default QuestionBankForm;
