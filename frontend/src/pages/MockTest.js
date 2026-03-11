
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Edit, FileText, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import axios from "../api/axios";

const toastErrorOnce = (msg) => toast.error(msg, { id: "one-error" });
const toastOkOnce = (msg) => toast.success(msg, { id: "one-success" });

const toggleInArray = (arr, value) => {
  const v = String(value || "").trim().toUpperCase();
  if (!v) return arr;
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
};

const isNoCategoryValue = (value) => {
  const v = String(value || "").trim().toUpperCase();
  return !v || v === "NO CATEGORY" || v === "NO_CATEGORY" || v === "NONE";
};

const MultiCheck = ({ title, options, values, onToggle, disabled = false }) => (
  <div className="p-3 border border-slate-200 rounded-xl bg-white">
    <p className="text-[11px] font-semibold text-slate-700 mb-2">{title}</p>
    <div className="max-h-[130px] overflow-y-auto space-y-1">
      {options.map((opt) => (
        <label key={`${title}-${opt.value}`} className="flex items-center gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={values.includes(opt.value)} onChange={() => onToggle(opt.value)} disabled={disabled} />
          <span>{opt.label}</span>
        </label>
      ))}
      {options.length === 0 && <p className="text-[11px] text-slate-400">No options</p>}
    </div>
  </div>
);

const QuestionInlineForm = ({ exams, categories, subjects, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [baseForm, setBaseForm] = useState({ examMasterId: "", examCategoryId: "", subjectId: "" });
  const [questionSetId, setQuestionSetId] = useState("");
  const [questionForm, setQuestionForm] = useState({
    marks: "",
    negativeMarks: "",
    questionText: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctOption: "",
    explanationText: "",
    status: "ACTIVE",
  });
  const [drafts, setDrafts] = useState([]);

  const filteredCategories = useMemo(() => {
    if (!baseForm.examMasterId) return [];
    return categories.filter((cat) => String(cat.examCode || "").toUpperCase() === String(baseForm.examMasterId || "").toUpperCase());
  }, [categories, baseForm.examMasterId]);
  const hasCategoriesForExam = useMemo(() => filteredCategories.length > 0, [filteredCategories]);

  const filteredSubjects = useMemo(() => {
    if (!baseForm.examMasterId) return [];
    if (hasCategoriesForExam && !baseForm.examCategoryId) return [];
    return subjects.filter(
      (s) =>
        String(s.examCode || "").toUpperCase() === String(baseForm.examMasterId || "").toUpperCase() &&
        (
          hasCategoriesForExam
            ? String(s.catId || "").toUpperCase() === String(baseForm.examCategoryId || "").toUpperCase()
            : isNoCategoryValue(s.catId)
        )
    );
  }, [subjects, baseForm.examMasterId, baseForm.examCategoryId, hasCategoriesForExam]);

  const loadId = async () => {
    try {
      const res = await axios.get("/master/question-bank/next-id");
      setQuestionSetId(res.data?.nextId || "QSET1");
    } catch {
      setQuestionSetId("QSET1");
    }
  };

  useEffect(() => {
    loadId();
  }, []);

  const addDraft = () => {
    setDrafts((prev) => [...prev, { ...questionForm }]);
    setQuestionForm((prev) => ({
      ...prev,
      questionText: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctOption: "",
      explanationText: "",
    }));
  };

  const submitAll = async () => {
    if (saving) return;
    if (!drafts.length) return toastErrorOnce("ADD AT LEAST ONE DRAFT");
    setSaving(true);
    try {
      await axios.post("/master/question-bank/upsert", { questionSetId, ...baseForm, questions: drafts });
      toastOkOnce("DRAFT QUESTIONS SAVED");
      setDrafts([]);
      await loadId();
      if (onSaved) onSaved();
    } catch (err) {
      toastErrorOnce(err?.response?.data?.message || "FAILED");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-4 shadow-sm space-y-3">
      <p className="text-sm font-semibold text-slate-800">Instant Add Multiple Questions</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select value={baseForm.examMasterId} onChange={(e) => setBaseForm((p) => ({ ...p, examMasterId: e.target.value, examCategoryId: "", subjectId: "" }))} className="p-2 border border-slate-200 rounded-lg text-sm"><option value="">Exam</option>{exams.map((ex) => <option key={ex.examCode} value={ex.examCode}>{ex.examName}</option>)}</select>
        {hasCategoriesForExam && <select value={baseForm.examCategoryId} onChange={(e) => setBaseForm((p) => ({ ...p, examCategoryId: e.target.value, subjectId: "" }))} className="p-2 border border-slate-200 rounded-lg text-sm"><option value="">Category</option>{filteredCategories.map((cat) => <option key={cat.catId} value={cat.catId}>{cat.catName}</option>)}</select>}
        <select value={baseForm.subjectId} onChange={(e) => setBaseForm((p) => ({ ...p, subjectId: e.target.value }))} className="p-2 border border-slate-200 rounded-lg text-sm"><option value="">Subject</option>{filteredSubjects.map((sub) => <option key={sub.syllabusId} value={sub.syllabusId}>{sub.subjectName}</option>)}</select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="p-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-blue-700">{questionSetId || "QSET..."}</div>
        <input type="number" step="0.5" value={questionForm.marks} onChange={(e) => setQuestionForm((p) => ({ ...p, marks: e.target.value }))} placeholder="Marks" className="p-2 border border-slate-200 rounded-lg text-sm" />
        <input type="number" step="0.25" value={questionForm.negativeMarks} onChange={(e) => setQuestionForm((p) => ({ ...p, negativeMarks: e.target.value }))} placeholder="Negative" className="p-2 border border-slate-200 rounded-lg text-sm" />
      </div>
      <textarea value={questionForm.questionText} onChange={(e) => setQuestionForm((p) => ({ ...p, questionText: e.target.value }))} placeholder="Question" className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input value={questionForm.optionA} onChange={(e) => setQuestionForm((p) => ({ ...p, optionA: e.target.value }))} placeholder="Option A" className="p-2 border border-slate-200 rounded-lg text-sm" />
        <input value={questionForm.optionB} onChange={(e) => setQuestionForm((p) => ({ ...p, optionB: e.target.value }))} placeholder="Option B" className="p-2 border border-slate-200 rounded-lg text-sm" />
        <input value={questionForm.optionC} onChange={(e) => setQuestionForm((p) => ({ ...p, optionC: e.target.value }))} placeholder="Option C" className="p-2 border border-slate-200 rounded-lg text-sm" />
        <input value={questionForm.optionD} onChange={(e) => setQuestionForm((p) => ({ ...p, optionD: e.target.value }))} placeholder="Option D" className="p-2 border border-slate-200 rounded-lg text-sm" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={addDraft} className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white">Add Draft</button>
        <button type="button" disabled={saving} onClick={submitAll} className="px-4 py-2 text-xs rounded-lg bg-slate-900 text-white">{saving ? "Saving..." : "Final Submit"}</button>
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
  const [showFormPage, setShowFormPage] = useState(false);
  const [showQuickQuestionForm, setShowQuickQuestionForm] = useState(false);
  const [showPaperView, setShowPaperView] = useState(false);
  const [paperSet, setPaperSet] = useState(null);
  const [paperQuestions, setPaperQuestions] = useState([]);
  const [paperLoading, setPaperLoading] = useState(false);
  const [expandedSetIds, setExpandedSetIds] = useState([]);
  const [filters, setFilters] = useState({ examMasterId: "", examStage: "", examCategoryId: "", subjectId: "" });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [editId, setEditId] = useState("");
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [form, setForm] = useState({
    questionSetId: "",
    examMasterId: "",
    examStage: "",
    examCategoryId: "",
    subjectId: "",
    examMasterIds: [],
    examStages: [],
    examCategoryIds: [],
    subjectIds: [],
    topicNames: [],
    subTopicNames: [],
    testDate: new Date().toISOString().slice(0, 10),
    status: "ACTIVE",
    selectionType: "AUTO",
    questionCount: 10,
    questionIds: [],
  });
  const [questionFilter, setQuestionFilter] = useState({ marks: "", negativeMarks: "" });
  const [showOnlySetQuestions, setShowOnlySetQuestions] = useState(true);
  const richViewClass = "text-sm text-slate-800 leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_th]:border [&_td]:border [&_th]:p-1.5 [&_td]:p-1.5 [&_th]:bg-slate-100";
  const listMathRef = useRef(null);
  const paperMathRef = useRef(null);

  const typesetMath = (root) => {
    if (!root) return;
    if (!window.MathJax || !window.MathJax.typesetPromise) {
      setTimeout(() => typesetMath(root), 200);
      return;
    }
    if (window.MathJax.typesetClear) window.MathJax.typesetClear([root]);
    window.MathJax.typesetPromise([root]);
  };

  const hasSetStage = useMemo(
    () => sets.some((row) => String(row.examStage || "").trim() || (Array.isArray(row.examStages) && row.examStages.length)),
    [sets]
  );

  const filteredCategories = useMemo(() => {
    if (!filters.examMasterId) return [];
    return categories.filter((cat) => String(cat.examCode || "").toUpperCase() === String(filters.examMasterId || "").toUpperCase());
  }, [categories, filters.examMasterId]);
  const filterNeedsCategory = useMemo(() => filteredCategories.length > 0, [filteredCategories]);
  const filterStageOptions = useMemo(
    () =>
      Array.from(
        new Set(
          filteredCategories
            .flatMap((cat) => [ ...(Array.isArray(cat.examStages) ? cat.examStages : []), cat.examStage ])
            .map((stage) => String(stage || "").trim().toUpperCase())
            .filter(Boolean)
        )
      ),
    [filteredCategories]
  );
  const filterNeedsStage = useMemo(() => filterNeedsCategory && filterStageOptions.length > 0, [filterNeedsCategory, filterStageOptions]);

  const filteredSubjects = useMemo(() => {
    if (!filters.examMasterId) return [];
    if (filterNeedsCategory && !filters.examCategoryId) return [];
    return subjects.filter(
      (s) =>
        String(s.examCode || "").toUpperCase() === String(filters.examMasterId || "").toUpperCase() &&
        (
          filterNeedsCategory
            ? String(s.catId || "").toUpperCase() === String(filters.examCategoryId || "").toUpperCase()
            : isNoCategoryValue(s.catId)
        ) &&
        (!filters.examStage || String(s.examStage || "").toUpperCase() === String(filters.examStage || "").toUpperCase())
    );
  }, [subjects, filters.examMasterId, filters.examCategoryId, filters.examStage, filterNeedsCategory]);

  const examsWithCategories = useMemo(
    () =>
      Array.from(
        new Set(categories.map((cat) => String(cat.examCode || "").toUpperCase()).filter(Boolean))
      ),
    [categories]
  );
  const selectedExamsWithCategory = useMemo(
    () => form.examMasterIds.filter((examId) => examsWithCategories.includes(examId)),
    [form.examMasterIds, examsWithCategories]
  );
  const selectedExamsWithoutCategory = useMemo(
    () => form.examMasterIds.filter((examId) => !examsWithCategories.includes(examId)),
    [form.examMasterIds, examsWithCategories]
  );
  const builderNeedsCategory = useMemo(() => selectedExamsWithCategory.length > 0, [selectedExamsWithCategory]);

  const builderCategories = useMemo(() => {
    if (!selectedExamsWithCategory.length) return [];
    return categories.filter((cat) => selectedExamsWithCategory.includes(String(cat.examCode || "").toUpperCase()));
  }, [categories, selectedExamsWithCategory]);

  const builderStages = useMemo(() => {
    if (!selectedExamsWithCategory.length || !form.examCategoryIds.length) return [];
    return Array.from(
      new Set(
        categories
          .filter((cat) => selectedExamsWithCategory.includes(String(cat.examCode || "").toUpperCase()) && form.examCategoryIds.includes(String(cat.catId || "").toUpperCase()))
          .flatMap((cat) => [ ...(Array.isArray(cat.examStages) ? cat.examStages : []), cat.examStage ])
          .map((stage) => String(stage || "").trim().toUpperCase())
          .filter(Boolean)
      )
    );
  }, [categories, selectedExamsWithCategory, form.examCategoryIds]);
  const builderNeedsStage = useMemo(() => builderNeedsCategory && builderStages.length > 0, [builderNeedsCategory, builderStages]);

  const builderSubjects = useMemo(() => {
    if (!form.examMasterIds.length) return [];
    return subjects.filter(
      (s) =>
        form.examMasterIds.includes(String(s.examCode || "").toUpperCase()) && (
          (
            selectedExamsWithCategory.includes(String(s.examCode || "").toUpperCase()) &&
            form.examCategoryIds.includes(String(s.catId || "").toUpperCase())
          ) || (
            selectedExamsWithoutCategory.includes(String(s.examCode || "").toUpperCase()) &&
            isNoCategoryValue(s.catId)
          )
        ) &&
        (!form.examStages.length || form.examStages.includes(String(s.examStage || "").toUpperCase()))
    );
  }, [subjects, form.examMasterIds, form.examCategoryIds, form.examStages, selectedExamsWithCategory, selectedExamsWithoutCategory]);

  const builderTopics = useMemo(() => {
    if (!form.subjectIds.length) return [];
    const selectedSubjects = subjects.filter((s) => form.subjectIds.includes(String(s.syllabusId || "").toUpperCase()));
    return Array.from(new Set(selectedSubjects.flatMap((s) => (Array.isArray(s.topics) ? s.topics : [])).map((t) => String(t?.topicName || "").toUpperCase()).filter(Boolean)));
  }, [subjects, form.subjectIds]);

  const builderSubTopics = useMemo(() => {
    if (!form.subjectIds.length || !form.topicNames.length) return [];
    const selectedSubjects = subjects.filter((s) => form.subjectIds.includes(String(s.syllabusId || "").toUpperCase()));
    return Array.from(
      new Set(
        selectedSubjects
          .flatMap((s) => (Array.isArray(s.topics) ? s.topics : []))
          .filter((t) => form.topicNames.includes(String(t?.topicName || "").toUpperCase()))
          .flatMap((t) => (Array.isArray(t.subTopics) ? t.subTopics : []))
          .map((sub) => String(sub || "").toUpperCase())
          .filter(Boolean)
      )
    );
  }, [subjects, form.subjectIds, form.topicNames]);


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
  const resetBuilder = async () => {
    try {
      const idRes = await axios.get("/master/mock-test/next-id");
      setEditId("");
      setIsViewOnly(false);
      setQuestionBankRows([]);
      setShowOnlySetQuestions(true);
      setQuestionFilter({ marks: "", negativeMarks: "" });
      setForm({
        questionSetId: idRes.data?.nextId || "QSET1",
        examMasterId: "",
        examStage: "",
        examCategoryId: "",
        subjectId: "",
        examMasterIds: [],
        examStages: [],
        examCategoryIds: [],
        subjectIds: [],
        topicNames: [],
        subTopicNames: [],
        testDate: new Date().toISOString().slice(0, 10),
        status: "ACTIVE",
        selectionType: "AUTO",
        questionCount: 10,
        questionIds: [],
      });
    } catch {
      toastErrorOnce("FAILED TO GENERATE SET ID");
    }
  };

  const openAddForm = async () => {
    await resetBuilder();
    setShowFormPage(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    fetchMasters();
    resetBuilder();
  }, []);

  useEffect(() => {
    fetchSets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.examMasterId, filters.examStage, filters.examCategoryId, filters.subjectId, pagination.page]);

  useEffect(() => {
    typesetMath(listMathRef.current);
  }, [questionBankRows]);

  useEffect(() => {
    if (showPaperView) typesetMath(paperMathRef.current);
  }, [showPaperView, paperQuestions]);

  const fetchQuestionBankRows = async () => {
    if (!form.subjectIds.length) return setQuestionBankRows([]);
    try {
      const params = new URLSearchParams();
      params.set("flat", "true");
      params.set("status", "ACTIVE");
      params.set("page", "1");
      params.set("limit", "1000");
      params.set("examMasterId", form.examMasterIds.join(","));
      if (form.examCategoryIds.length) params.set("examCategoryId", form.examCategoryIds.join(","));
      params.set("subjectId", form.subjectIds.join(","));
      if (form.examStages.length) params.set("examStage", form.examStages.join(","));
      if (form.topicNames.length) params.set("topicName", form.topicNames.join(","));
      if (form.subTopicNames.length) params.set("subTopicName", form.subTopicNames.join(","));
      if (String(questionFilter.marks || "").trim() !== "") params.set("marks", String(questionFilter.marks));
      if (String(questionFilter.negativeMarks || "").trim() !== "") params.set("negativeMarks", String(questionFilter.negativeMarks));
      const res = await axios.get(`/master/question-bank/all?${params.toString()}`);
      setQuestionBankRows(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setQuestionBankRows([]);
    }
  };

  const handleViewOrEdit = async (id, canEdit) => {
    try {
      const res = await axios.get(`/master/mock-test/set/${id}`);
      const row = res.data?.data;
      if (!row) return;
      setShowPaperView(false);
      setEditId(canEdit ? row._id : "");
      setIsViewOnly(!canEdit);
      setShowOnlySetQuestions(true);
      setForm({
        questionSetId: row.questionSetId || "",
        examMasterId: row.examMasterId || "",
        examStage: row.examStage || "",
        examCategoryId: row.examCategoryId || "",
        subjectId: row.subjectId || "",
        examMasterIds: Array.isArray(row.examMasterIds) && row.examMasterIds.length ? row.examMasterIds : [row.examMasterId].filter(Boolean),
        examStages: Array.isArray(row.examStages) && row.examStages.length ? row.examStages : [row.examStage].filter(Boolean),
        examCategoryIds: Array.isArray(row.examCategoryIds) && row.examCategoryIds.length ? row.examCategoryIds : [row.examCategoryId].filter(Boolean),
        subjectIds: Array.isArray(row.subjectIds) && row.subjectIds.length ? row.subjectIds : [row.subjectId].filter(Boolean),
        topicNames: Array.isArray(row.topicNames) && row.topicNames.length ? row.topicNames : [row.topicName].filter(Boolean),
        subTopicNames: Array.isArray(row.subTopicNames) && row.subTopicNames.length ? row.subTopicNames : [row.subTopicName].filter(Boolean),
        testDate: row.testDate ? new Date(row.testDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        status: row.status || "ACTIVE",
        selectionType: "MANUAL",
        questionCount: (row.questionIds || []).length || 10,
        questionIds: (row.questionIds || []).map((q) => (typeof q === "string" ? q : q.questionBankId || q._id)),
      });
      setQuestionBankRows(Array.isArray(row.questionDetails) ? row.questionDetails : []);
      setShowFormPage(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toastErrorOnce("FAILED TO LOAD SET");
    }
  };

  const openPaperView = async (id) => {
    setPaperLoading(true);
    try {
      const res = await axios.get(`/master/mock-test/set/${id}`);
      const row = res.data?.data;
      if (!row) return;
      setPaperSet(row);
      setPaperQuestions(Array.isArray(row.questionDetails) ? row.questionDetails : []);
      setShowPaperView(true);
      setShowFormPage(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toastErrorOnce("FAILED TO LOAD SET");
    } finally {
      setPaperLoading(false);
    }
  };

  const autoPickQuestions = async (forceRestart = false) => {
    if (isViewOnly) return toastErrorOnce("VIEW MODE ENABLED");
    if (!form.examMasterIds.length || !form.subjectIds.length) return toastErrorOnce("SELECT EXAM, SUBJECT");
    if (builderNeedsCategory && !form.examCategoryIds.length) return toastErrorOnce("SELECT CATEGORY");
    const needSingleCategory = builderNeedsCategory ? form.examCategoryIds.length === 1 : true;
    if (form.examMasterIds.length !== 1 || !needSingleCategory || form.subjectIds.length !== 1) return toastErrorOnce("AUTO PICK SUPPORTS SINGLE EXAM/CATEGORY/SUBJECT ONLY");
    try {
      const params = new URLSearchParams();
      params.set("examMasterId", form.examMasterIds[0]);
      if (builderNeedsCategory) params.set("examCategoryId", form.examCategoryIds[0]);
      params.set("subjectId", form.subjectIds[0]);
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
    if (!form.examMasterIds.length || !form.subjectIds.length) return toastErrorOnce("SELECT EXAM, SUBJECT");
    if (builderNeedsCategory && !form.examCategoryIds.length) return toastErrorOnce("SELECT CATEGORY");
    if (!form.testDate) return toastErrorOnce("SELECT TEST DATE");
    if (!form.questionIds.length) return toastErrorOnce("SELECT QUESTIONS");
    setSaving(true);
    try {
      await axios.post("/master/mock-test/upsert", {
        id: editId || undefined,
        questionSetId: form.questionSetId,
        examMasterId: form.examMasterIds[0],
        examStage: form.examStages[0] || undefined,
        examCategoryId: form.examCategoryIds[0] || undefined,
        subjectId: form.subjectIds[0],
        examMasterIds: form.examMasterIds,
        examStages: form.examStages,
        examCategoryIds: form.examCategoryIds,
        subjectIds: form.subjectIds,
        topicNames: form.topicNames,
        subTopicNames: form.subTopicNames,
        testDate: form.testDate,
        status: form.status,
        isActive: form.status === "ACTIVE",
        isSelectedForAttempt: false,
        questionIds: form.questionIds,
      });
      toastOkOnce(editId ? "SET UPDATED" : "SET CREATED");
      setShowFormPage(false);
      setIsViewOnly(false);
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3f7ff_0%,#ecfeff_45%,#f8fafc_100%)]">
      <header className="p-3 space-y-3">
        <div className="px-4 py-3 rounded-3xl border border-sky-100 bg-white shadow-sm flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <h1 className="text-lg font-semibold text-slate-900">Mock Test Question Sets</h1>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={fetchSets} className="p-2 bg-slate-50 text-slate-900 rounded-xl border border-slate-100"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button>
              <button onClick={openAddForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs shadow-sm"><Plus size={14} />Add Question Set</button>
              <button onClick={() => setShowQuickQuestionForm((p) => !p)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs shadow-sm"><Plus size={14} />{showQuickQuestionForm ? "Hide" : "Show"} Quick Question</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select value={filters.examMasterId} onChange={(e) => { setFilters((p) => ({ ...p, examMasterId: e.target.value, examStage: "", examCategoryId: "", subjectId: "" })); setPagination((p) => ({ ...p, page: 1 })); }} className="p-2 border border-slate-200 rounded-xl text-sm"><option value="">All Exams</option>{exams.map((ex) => <option key={ex.examCode} value={ex.examCode}>{ex.examName}</option>)}</select>
            {filterNeedsCategory && <select value={filters.examCategoryId} onChange={(e) => { const categoryId = e.target.value; setFilters((p) => ({ ...p, examCategoryId: categoryId, examStage: "", subjectId: "" })); setPagination((p) => ({ ...p, page: 1 })); }} className="p-2 border border-slate-200 rounded-xl text-sm"><option value="">All Categories</option>{filteredCategories.map((cat) => <option key={cat.catId} value={cat.catId}>{cat.catName}</option>)}</select>}
            {filterNeedsStage && <select value={filters.examStage} onChange={(e) => { setFilters((p) => ({ ...p, examStage: e.target.value, subjectId: "" })); setPagination((p) => ({ ...p, page: 1 })); }} className="p-2 border border-slate-200 rounded-xl text-sm"><option value="">All Stages</option>{filterStageOptions.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select>}
            <select value={filters.subjectId} onChange={(e) => { setFilters((p) => ({ ...p, subjectId: e.target.value })); setPagination((p) => ({ ...p, page: 1 })); }} className="p-2 border border-slate-200 rounded-xl text-sm"><option value="">All Subjects</option>{filteredSubjects.map((sub) => <option key={sub.syllabusId} value={sub.syllabusId}>{sub.subjectName}</option>)}</select>
            <select value={pagination.page} onChange={(e) => setPagination((p) => ({ ...p, page: Number(e.target.value) }))} className="p-2 border border-slate-200 rounded-xl text-sm">{Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => <option key={p} value={p}>Page {p}</option>)}</select>
          </div>
        </div>
      </header>

      {showQuickQuestionForm && <section className="px-3 pb-3"><QuestionInlineForm exams={exams} categories={categories} subjects={subjects} onSaved={fetchQuestionBankRows} /></section>}

      {showPaperView && (
      <section className="px-3 pb-3" ref={paperMathRef}>
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Question Paper View</h2>
              <p className="text-xs text-slate-500">Set ID: <span className="font-semibold text-blue-700">{paperSet?.questionSetId || "--"}</span></p>
            </div>
            <button type="button" onClick={() => { setShowPaperView(false); setPaperSet(null); setPaperQuestions([]); }} className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-700">Back</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
            <div><span className="font-semibold text-slate-700">Exam:</span> {paperSet?.examName || "---"}</div>
            <div><span className="font-semibold text-slate-700">Category:</span> {paperSet?.categoryName || "---"}</div>
            <div><span className="font-semibold text-slate-700">Subject:</span> {paperSet?.subjectName || "---"}</div>
          </div>

          {paperLoading ? (
            <div className="p-10 text-center text-slate-300 font-semibold">Loading...</div>
          ) : (
            <div className="space-y-4">
              {paperQuestions.map((q, idx) => (
                <div key={q._id || q.questionBankId || idx} className="border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="font-semibold text-slate-800">Q{idx + 1}</div>
                    <div>Marks: <span className="font-semibold text-slate-800">{q.marks ?? "--"}</span> | Neg: <span className="font-semibold text-slate-800">{q.negativeMarks ?? "--"}</span></div>
                  </div>

                  <div className={`${richViewClass} whitespace-pre-wrap`}>
                    {q.questionText || "---"}
                  </div>

                  {(Array.isArray(q.questionImages) ? q.questionImages : []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {q.questionImages.map((img, i) => (
                        <img key={`qimg-${idx}-${i}`} src={img} alt="question" className="h-24 w-24 object-cover rounded-lg border border-slate-200" />
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    {["A", "B", "C", "D"].map((opt) => (
                      <div key={`${idx}-${opt}`} className="rounded-xl border border-slate-100 p-3">
                        <div className="text-xs font-semibold text-slate-600 mb-1">Option {opt}</div>
                        <div className={`${richViewClass} whitespace-pre-wrap`}>
                          {q[`option${opt}`] || "---"}
                        </div>
                        {(Array.isArray(q.optionImages?.[opt]) ? q.optionImages?.[opt] : []).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {q.optionImages[opt].map((img, i) => (
                              <img key={`opt-${idx}-${opt}-${i}`} src={img} alt={`option-${opt}`} className="h-20 w-20 object-cover rounded-lg border border-slate-200" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="text-sm font-semibold text-emerald-700">
                    Correct Answer: <span className="text-slate-900">{q.correctOption || "--"}</span>
                  </div>

                  <div className={`${richViewClass} whitespace-pre-wrap`}>
                    <div className="text-xs font-semibold text-slate-600 mb-1">Explanation</div>
                    {q.explanationText || "---"}
                  </div>

                  {(Array.isArray(q.explanationImages) ? q.explanationImages : []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {q.explanationImages.map((img, i) => (
                        <img key={`exp-${idx}-${i}`} src={img} alt="explanation" className="h-24 w-24 object-cover rounded-lg border border-slate-200" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {paperQuestions.length === 0 && <div className="p-10 text-center text-slate-300 font-semibold">No questions in this set.</div>}
            </div>
          )}
        </div>
      </section>
      )}

      {showFormPage && (
      <section className="px-3 pb-3">
        <form onSubmit={submit} className="bg-white rounded-2xl border border-sky-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-base font-semibold text-slate-900">{isViewOnly ? "View Question Set" : editId ? "Edit Question Set" : "Create Question Set"}</h2><div className="flex items-center gap-2"><div className="text-xs text-slate-500">Set ID: <span className="font-semibold text-blue-700">{form.questionSetId || "--"}</span></div><button type="button" onClick={() => setShowFormPage(false)} className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-700">Back</button></div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input disabled={isViewOnly} type="date" value={form.testDate} onChange={(e) => setForm((p) => ({ ...p, testDate: e.target.value }))} className="p-2 border border-slate-200 rounded-xl text-sm disabled:bg-slate-100" />
            <select disabled={isViewOnly} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="p-2 border border-slate-200 rounded-xl text-sm disabled:bg-slate-100"><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MultiCheck title="Exam" disabled={isViewOnly} values={form.examMasterIds} onToggle={(v) => setForm((p) => ({ ...p, examMasterIds: toggleInArray(p.examMasterIds, v), examCategoryIds: [], examStages: [], subjectIds: [], topicNames: [], subTopicNames: [], questionIds: [] }))} options={exams.map((ex) => ({ value: String(ex.examCode || "").toUpperCase(), label: ex.examName }))} />
            {builderNeedsCategory && <MultiCheck title="Category" disabled={isViewOnly} values={form.examCategoryIds} onToggle={(v) => setForm((p) => ({ ...p, examCategoryIds: toggleInArray(p.examCategoryIds, v), examStages: [], subjectIds: [], topicNames: [], subTopicNames: [], questionIds: [] }))} options={builderCategories.map((cat) => ({ value: String(cat.catId || "").toUpperCase(), label: cat.catName }))} />}
            {builderNeedsStage && <MultiCheck title="Exam Stage" disabled={isViewOnly} values={form.examStages} onToggle={(v) => setForm((p) => ({ ...p, examStages: toggleInArray(p.examStages, v), subjectIds: [], topicNames: [], subTopicNames: [], questionIds: [] }))} options={builderStages.map((stage) => ({ value: stage, label: stage }))} />}
            <MultiCheck title="Subject" disabled={isViewOnly} values={form.subjectIds} onToggle={(v) => setForm((p) => ({ ...p, subjectIds: toggleInArray(p.subjectIds, v), topicNames: [], subTopicNames: [], questionIds: [] }))} options={builderSubjects.map((sub) => ({ value: String(sub.syllabusId || "").toUpperCase(), label: sub.subjectName }))} />
            <MultiCheck title="Topic" disabled={isViewOnly} values={form.topicNames} onToggle={(v) => setForm((p) => ({ ...p, topicNames: toggleInArray(p.topicNames, v), subTopicNames: [], questionIds: [] }))} options={builderTopics.map((topic) => ({ value: topic, label: topic }))} />
            <MultiCheck title="SubTopic" disabled={isViewOnly} values={form.subTopicNames} onToggle={(v) => setForm((p) => ({ ...p, subTopicNames: toggleInArray(p.subTopicNames, v), questionIds: [] }))} options={builderSubTopics.map((sub) => ({ value: sub, label: sub }))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input type="number" placeholder="Marks Filter" value={questionFilter.marks} onChange={(e) => setQuestionFilter((p) => ({ ...p, marks: e.target.value }))} className="p-2 border border-slate-200 rounded-xl text-sm" />
            <input type="number" placeholder="Negative Filter" value={questionFilter.negativeMarks} onChange={(e) => setQuestionFilter((p) => ({ ...p, negativeMarks: e.target.value }))} className="p-2 border border-slate-200 rounded-xl text-sm" />
            <button type="button" onClick={fetchQuestionBankRows} className="px-3 py-2 bg-blue-600 text-white text-xs rounded-lg">Load Questions</button>
            {!editId ? <div className="grid grid-cols-2 gap-2"><select value={form.selectionType} onChange={(e) => setForm((p) => ({ ...p, selectionType: e.target.value, questionIds: [] }))} className="p-2 border border-slate-200 rounded-lg text-xs"><option value="AUTO">AUTO</option><option value="MANUAL">MANUAL</option></select><input type="number" min="1" value={form.questionCount} onChange={(e) => setForm((p) => ({ ...p, questionCount: Number(e.target.value) }))} className="p-2 border border-slate-200 rounded-lg text-xs" /></div> : <button type="button" onClick={async () => { if (showOnlySetQuestions) { await fetchQuestionBankRows(); setShowOnlySetQuestions(false); } else { const res = await axios.get(`/master/mock-test/set/${editId}`); const row = res.data?.data; setQuestionBankRows(Array.isArray(row?.questionDetails) ? row.questionDetails : []); setShowOnlySetQuestions(true); } }} className="px-3 py-2 bg-slate-100 text-slate-700 text-xs rounded-lg">{showOnlySetQuestions ? "Show Filtered Questions" : "Show Set Questions"}</button>}
          </div>
          {!editId && form.selectionType === "AUTO" && <button type="button" onClick={() => autoPickQuestions(false)} className="px-3 py-2 bg-indigo-600 text-white text-xs rounded-lg">Auto Pick Next Questions</button>}
          <div className="border border-slate-200 rounded-xl overflow-hidden" ref={listMathRef}><div className="max-h-[42vh] overflow-auto"><table className="w-full text-left"><thead><tr className="bg-slate-100 text-slate-700 text-xs font-semibold"><th className="p-2">Select</th><th className="p-2">Q.ID</th><th className="p-2">Question</th><th className="p-2">Marks</th><th className="p-2">Neg</th></tr></thead><tbody>{questionBankRows.map((q) => { const qbId = q.questionBankId || q._id; const checked = form.questionIds.includes(qbId); return <tr key={qbId} className="border-t border-slate-100"><td className="p-2"><input type="checkbox" checked={checked} onChange={() => setForm((prev) => ({ ...prev, questionIds: checked ? prev.questionIds.filter((x) => x !== qbId) : [...prev.questionIds, qbId] }))} disabled={isViewOnly || (!editId && form.selectionType === "AUTO")} /></td><td className="p-2 text-xs font-semibold text-blue-700">{q.questionBankId}</td><td className="p-2 text-xs whitespace-pre-wrap">{q.questionText}</td><td className="p-2 text-xs">{q.marks}</td><td className="p-2 text-xs">{q.negativeMarks}</td></tr>; })}{questionBankRows.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-xs text-slate-400">No questions found for selected filters.</td></tr>}</tbody></table></div></div>
          <div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-600">Selected Questions: {form.questionIds.length}</p>{!isViewOnly && <button disabled={saving} className="px-5 py-2 bg-slate-900 text-white rounded-xl flex items-center gap-2 text-sm">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{editId ? "Update Set" : "Create Set"}</button>}</div>
        </form>
      </section>
      )}

      {!showFormPage && !showPaperView && (
      <section className="px-3 pb-4 bg-white rounded-[12px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="bg-[#0F172A] text-white text-[11px] font-semibold"><th className="p-2">Set ID</th><th className="p-2">Date</th><th className="p-2">Exam</th>{hasSetStage && <th className="p-2">Stage</th>}<th className="p-2">Category</th><th className="p-2">Subject</th><th className="p-2">Status</th><th className="p-2">Student</th><th className="p-2 text-center">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <tr><td colSpan={hasSetStage ? 9 : 8} className="p-20 text-center text-slate-300 font-semibold">Loading...</td></tr> : sets.length > 0 ? sets.map((row) => (
                <React.Fragment key={row._id}>
                  <tr className="hover:bg-blue-50/30">
                    <td className="p-2 text-blue-600 text-sm font-semibold">{row.questionSetId}</td>
                    <td className="p-2 text-xs font-normal">{new Date(row.testDate).toLocaleDateString()}</td>
                    <td className="p-2 text-xs font-normal">{row.examName}</td>
                    {hasSetStage && <td className="p-2 text-xs font-normal">{(Array.isArray(row.examStages) ? row.examStages.join(", ") : row.examStage) || "---"}</td>}
                    <td className="p-2 text-xs font-normal">{row.categoryName}</td>
                    <td className="p-2 text-xs font-normal">{row.subjectName}</td>
                    <td className="p-2 text-xs font-normal">{row.status}</td>
                    <td className="p-2 text-xs font-semibold">{row.isSelectedForAttempt ? <button onClick={() => selectForStudent(row._id, false)} className="px-3 py-1 rounded-full bg-emerald-500 text-white hover:bg-red-500 text-[11px]">Visible</button> : <button onClick={() => selectForStudent(row._id, true)} className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white text-[11px] border border-slate-200">Hidden</button>}</td>
                    <td className="p-2 flex justify-center gap-2"><button onClick={() => setExpandedSetIds((prev) => (prev.includes(row._id) ? prev.filter((id) => id !== row._id) : [...prev, row._id]))} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[11px]">Details</button><button onClick={() => openPaperView(row._id)} className="p-2 bg-slate-100 text-slate-600 rounded-xl"><FileText size={16} /></button><button onClick={() => handleViewOrEdit(row._id, true)} className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Edit size={16} /></button><button onClick={() => removeSet(row._id)} className="p-2 bg-red-50 text-red-400 rounded-xl"><Trash2 size={16} /></button></td>
                  </tr>
                  {expandedSetIds.includes(row._id) && <tr className="bg-slate-50/70">
                    <td colSpan={hasSetStage ? 9 : 8} className="p-2">
                      <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-[10px]">
                          <thead className="bg-slate-100 text-slate-700">
                            <tr>
                              <th className="p-2">Exam</th>
                              <th className="p-2">Category</th>
                              <th className="p-2">Subject</th>
                              <th className="p-2">Topic</th>
                              <th className="p-2">SubTopic</th>
                              <th className="p-2 text-right">Questions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(Array.isArray(row.questionBreakdown) ? row.questionBreakdown : []).length > 0 ? (
                              row.questionBreakdown.map((b, idx) => (
                                <tr key={`${row._id}-b-${idx}`} className="border-t border-slate-100">
                                  <td className="p-2">{b.examName || "---"}</td>
                                  <td className="p-2">{b.categoryName || "---"}</td>
                                  <td className="p-2">{b.subjectName || "---"}</td>
                                  <td className="p-2">{b.topicName || "---"}</td>
                                  <td className="p-2">{b.subTopicName || "---"}</td>
                                  <td className="p-2 text-right font-semibold">{b.count || 0}</td>
                                </tr>
                              ))
                            ) : (
                              <tr><td colSpan="6" className="p-2 text-center text-slate-400">No breakdown available</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>}
                </React.Fragment>
              )) : <tr><td colSpan={hasSetStage ? 9 : 8} className="p-20 text-center text-slate-300 font-semibold">No Records</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      )}
    </div>
  );
};

export default MockTest;
