import React, { useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "../api/axios";

const emptyQuestion = {
  questionId: "",
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "A",
  explanationText: "",
  difficultyLevel: "moderate",
  languageCode: "en",
  isActive: true,
};

const nextQsSetId = (currentId) => {
  const n = parseInt(String(currentId || "").replace("QS-SET", ""), 10);
  return `QS-SET${(Number.isNaN(n) ? 0 : n) + 1}`;
};

const MockTest = () => {
  const [searchParams] = useSearchParams();
  const querySubjectId = searchParams.get("subjectId") || "";

  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [baseForm, setBaseForm] = useState({
    examMasterId: "",
    examCategoryId: "",
    subjectId: "",
    questionMarks: Number(localStorage.getItem("mocktest_question_marks") || 1),
    negativeMark: Number(localStorage.getItem("mocktest_negative_marks") || 0),
  });
  const [questionForm, setQuestionForm] = useState({ ...emptyQuestion });
  const [draftQuestions, setDraftQuestions] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [examRes, catRes, subRes, rowRes] = await Promise.allSettled([
        axios.get("/master/exam"),
        axios.get("/master/category/all"),
        axios.get("/master/syllabus/all"),
        axios.get(
          querySubjectId
            ? `/master/mock-test/all?subjectId=${encodeURIComponent(querySubjectId)}`
            : "/master/mock-test/all"
        ),
      ]);

      const examList =
        examRes.status === "fulfilled"
          ? Array.isArray(examRes.value.data)
            ? examRes.value.data
            : examRes.value.data?.data || []
          : [];
      const catList =
        catRes.status === "fulfilled"
          ? Array.isArray(catRes.value.data)
            ? catRes.value.data
            : catRes.value.data?.data || []
          : [];
      const subList =
        subRes.status === "fulfilled"
          ? Array.isArray(subRes.value.data)
            ? subRes.value.data
            : subRes.value.data?.data || []
          : [];
      const mockList =
        rowRes.status === "fulfilled"
          ? Array.isArray(rowRes.value.data)
            ? rowRes.value.data
            : rowRes.value.data?.data || []
          : [];

      setExams(examList);
      setCategories(catList);
      setSubjects(subList);
      setRows(mockList);
    } catch {
      toast.error("DATABASE SYNC FAILED");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [querySubjectId]);

  useEffect(() => {
    localStorage.setItem("mocktest_question_marks", String(baseForm.questionMarks ?? 1));
  }, [baseForm.questionMarks]);

  useEffect(() => {
    localStorage.setItem("mocktest_negative_marks", String(baseForm.negativeMark ?? 0));
  }, [baseForm.negativeMark]);

  const filteredCategories = useMemo(() => {
    const selectedExam = exams.find((ex) => String(ex._id) === String(baseForm.examMasterId));
    if (!selectedExam) return [];
    return categories.filter(
      (cat) =>
        String(cat.examCode || "").toUpperCase() === String(selectedExam.examCode || "").toUpperCase()
    );
  }, [categories, exams, baseForm.examMasterId]);

  const filteredSubjects = useMemo(() => {
    const selectedExam = exams.find((ex) => String(ex._id) === String(baseForm.examMasterId));
    const selectedCategory = categories.find((cat) => String(cat._id) === String(baseForm.examCategoryId));
    if (!selectedExam || !selectedCategory) return [];
    return subjects.filter(
      (s) =>
        String(s.examCode || "").toUpperCase() === String(selectedExam.examCode || "").toUpperCase() &&
        String(s.catId || "").toUpperCase() === String(selectedCategory.catId || "").toUpperCase()
    );
  }, [subjects, exams, categories, baseForm.examMasterId, baseForm.examCategoryId]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return rows.filter(
      (r) =>
        (r.questionId || "").toLowerCase().includes(q) ||
        (r.examName || "").toLowerCase().includes(q) ||
        (r.categoryName || "").toLowerCase().includes(q) ||
        (r.subjectName || "").toLowerCase().includes(q) ||
        (r.questionText || "").toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  const openAddModal = async () => {
    setEditId(null);
    setDraftQuestions([]);
    try {
      const idRes = await axios.get("/master/mock-test/next-id");
      const initialId = idRes.data?.nextId || "QS-SET1";
      const nextBase = {
        examMasterId: "",
        examCategoryId: "",
        subjectId: querySubjectId || "",
        questionMarks: Number(localStorage.getItem("mocktest_question_marks") || 1),
        negativeMark: Number(localStorage.getItem("mocktest_negative_marks") || 0),
      };

      if (querySubjectId) {
        const selectedSubject = subjects.find((s) => String(s._id) === String(querySubjectId));
        if (selectedSubject) {
          const matchedExam = exams.find(
            (e) =>
              String(e.examCode || "").toUpperCase() === String(selectedSubject.examCode || "").toUpperCase()
          );
          const matchedCategory = categories.find(
            (c) =>
              String(c.catId || "").toUpperCase() === String(selectedSubject.catId || "").toUpperCase() &&
              String(c.examCode || "").toUpperCase() === String(selectedSubject.examCode || "").toUpperCase()
          );
          nextBase.examMasterId = matchedExam?._id || "";
          nextBase.examCategoryId = matchedCategory?._id || "";
        }
      }

      setBaseForm(nextBase);
      setQuestionForm({ ...emptyQuestion, questionId: initialId });
      setIsModalOpen(true);
    } catch {
      toast.error("ID GENERATION FAILED");
    }
  };

  const handleEdit = (row) => {
    setEditId(row._id);
    setDraftQuestions([]);
    setBaseForm({
      examMasterId: row.examMasterId || "",
      examCategoryId: row.examCategoryId || "",
      subjectId: row.subjectId || "",
      questionMarks: Number(row.marks ?? 1),
      negativeMark: Number(row.negativeMarks ?? 0),
    });
    setQuestionForm({
      questionId: row.questionId || "",
      questionText: row.questionText || "",
      optionA: row.optionA || "",
      optionB: row.optionB || "",
      optionC: row.optionC || "",
      optionD: row.optionD || "",
      correctOption: row.correctOption || "A",
      explanationText: row.explanationText || "",
      difficultyLevel: row.difficultyLevel || "moderate",
      languageCode: row.languageCode || "en",
      isActive: Boolean(row.isActive),
    });
    setIsModalOpen(true);
  };

  const validateQuestion = (q) => {
    if (!q.questionText.trim()) return "PLEASE ENTER QUESTION";
    if (!q.optionA.trim() || !q.optionB.trim() || !q.optionC.trim() || !q.optionD.trim()) {
      return "PLEASE ENTER ALL OPTIONS";
    }
    return "";
  };

  const addQuestionDraft = () => {
    if (!baseForm.examMasterId || !baseForm.examCategoryId || !baseForm.subjectId) {
      toast.error("SELECT EXAM, CATEGORY, SUBJECT FIRST");
      return;
    }
    const errorMsg = validateQuestion(questionForm);
    if (errorMsg) return toast.error(errorMsg);

    setDraftQuestions((prev) => [...prev, { ...questionForm }]);
    setQuestionForm((prev) => ({
      ...emptyQuestion,
      questionId: nextQsSetId(prev.questionId),
      languageCode: prev.languageCode || "en",
      difficultyLevel: prev.difficultyLevel || "moderate",
      isActive: prev.isActive,
    }));
    toast.success("QUESTION ADDED");
  };

  const editDraftQuestion = (idx) => {
    const item = draftQuestions[idx];
    if (!item) return;
    setQuestionForm({ ...item });
    setDraftQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeDraftQuestion = (idx) => {
    setDraftQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveDraftBatch = async () => {
    if (draftQuestions.length === 0) {
      toast.error("ADD AT LEAST ONE QUESTION");
      return;
    }
    setIsSaving(true);
    try {
      for (const q of draftQuestions) {
        await axios.post("/master/mock-test/upsert", {
          ...baseForm,
          marks: Number(baseForm.questionMarks || 1),
          negativeMarks: Number(baseForm.negativeMark || 0),
          ...q,
        });
      }
      toast.success("ALL QUESTIONS SAVED");
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "SAVE FAILED");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!baseForm.examMasterId || !baseForm.examCategoryId || !baseForm.subjectId) {
      return toast.error("SELECT EXAM, CATEGORY, SUBJECT");
    }

    if (editId) {
      const errorMsg = validateQuestion(questionForm);
      if (errorMsg) return toast.error(errorMsg);

      setIsSaving(true);
      try {
        const res = await axios.post("/master/mock-test/upsert", {
          id: editId,
          ...baseForm,
          marks: Number(baseForm.questionMarks || 1),
          negativeMarks: Number(baseForm.negativeMark || 0),
          ...questionForm,
        });
        if (res.data.success) {
          toast.success("UPDATED");
          setIsModalOpen(false);
          setEditId(null);
          fetchData();
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || "UPDATE FAILED");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    await saveDraftBatch();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("ARE YOU SURE?")) return;
    try {
      await axios.delete(`/master/mock-test/${id}`);
      toast.success("DELETED");
      fetchData();
    } catch {
      toast.error("DELETE FAILED");
    }
  };

  return (
    <div className="flex flex-col h-full min-w-0 relative bg-[#F0F7FF] min-h-screen">
      <header className="p-2 md:p-2 space-y-2">
        <div className="bg-white px-4 py-2 rounded-[24px] border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-lg font-semibold text-slate-900">Mock Test Master</h1>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="p-2 bg-slate-50 text-slate-900 rounded-2xl border border-slate-100">
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={openAddModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl text-xs shadow-lg">
              <Plus size={14} strokeWidth={3} />
              Add New
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-900" size={20} />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-2 bg-white border-2 border-slate-100 rounded-[20px] text-sm font-semibold outline-none focus:border-blue-600"
          />
        </div>
      </header>

      <section className="bg-white rounded-[10px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#0F172A] text-white text-[11px] font-semibold">
                <th className="p-2">Question ID</th>
                <th className="p-2">Exam</th>
                <th className="p-2">Category</th>
                <th className="p-2">Subject</th>
                <th className="p-2">Difficulty</th>
                <th className="p-2">Active</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="7" className="p-20 text-center text-slate-300 font-semibold">Loading...</td></tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <tr key={row._id} className="hover:bg-blue-50/30">
                    <td className="p-2 text-blue-600 text-sm font-semibold">{row.questionId}</td>
                    <td className="p-2 text-xs font-semibold">{row.examName}</td>
                    <td className="p-2 text-xs font-semibold">{row.categoryName}</td>
                    <td className="p-2 text-xs font-semibold">{row.subjectName}</td>
                    <td className="p-2 text-xs font-semibold">{row.difficultyLevel}</td>
                    <td className="p-2 text-xs font-semibold">{row.isActive ? "YES" : "NO"}</td>
                    <td className="p-2 flex justify-center gap-2">
                      <button onClick={() => handleEdit(row)} className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(row._id)} className="p-2 bg-red-50 text-red-400 rounded-xl">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" className="p-20 text-center text-slate-300 font-semibold">No Records</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>

          <form onSubmit={handleSubmit} className="relative bg-white w-full max-w-6xl p-8 rounded-[30px] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">{editId ? "Update Question" : "Add Multiple Questions"}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-900 mb-1 block">Exam</label>
                <select
                  required
                  value={baseForm.examMasterId}
                  onChange={(e) => setBaseForm({ ...baseForm, examMasterId: e.target.value, examCategoryId: "", subjectId: "" })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-600"
                >
                  <option value="">-- Select Exam --</option>
                  {exams.map((ex) => <option key={ex._id} value={ex._id}>{ex.examName}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-900 mb-1 block">Category</label>
                <select
                  required
                  value={baseForm.examCategoryId}
                  onChange={(e) => setBaseForm({ ...baseForm, examCategoryId: e.target.value, subjectId: "" })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-600"
                >
                  <option value="">-- Select Category --</option>
                  {filteredCategories.map((cat) => <option key={cat._id} value={cat._id}>{cat.catName}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-900 mb-1 block">Subject</label>
                <select
                  required
                  value={baseForm.subjectId}
                  onChange={(e) => setBaseForm({ ...baseForm, subjectId: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-600"
                >
                  <option value="">-- Select Subject --</option>
                  {filteredSubjects.map((sub) => <option key={sub._id} value={sub._id}>{sub.subjectName}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-900 mb-1 block">Marks / Question</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={baseForm.questionMarks}
                  onChange={(e) => setBaseForm({ ...baseForm, questionMarks: Number(e.target.value) })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-900 mb-1 block">Negative Mark</label>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={baseForm.negativeMark}
                  onChange={(e) => setBaseForm({ ...baseForm, negativeMark: Number(e.target.value) })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="mt-5 border border-slate-200 rounded-2xl p-4 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-900 mb-1 block">Question ID</label>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-blue-600">
                    {questionForm.questionId || "..."}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-900 mb-1 block">Difficulty</label>
                  <select
                    value={questionForm.difficultyLevel}
                    onChange={(e) => setQuestionForm({ ...questionForm, difficultyLevel: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-600"
                  >
                    <option value="easy">easy</option>
                    <option value="moderate">moderate</option>
                    <option value="hard">hard</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-slate-900 mb-1 block">Question Text</label>
                  <textarea
                    value={questionForm.questionText}
                    onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-600"
                  />
                </div>

                <div><label className="text-sm font-semibold block mb-1">Option A</label><input value={questionForm.optionA} onChange={(e) => setQuestionForm({ ...questionForm, optionA: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-600" /></div>
                <div><label className="text-sm font-semibold block mb-1">Option B</label><input value={questionForm.optionB} onChange={(e) => setQuestionForm({ ...questionForm, optionB: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-600" /></div>
                <div><label className="text-sm font-semibold block mb-1">Option C</label><input value={questionForm.optionC} onChange={(e) => setQuestionForm({ ...questionForm, optionC: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-600" /></div>
                <div><label className="text-sm font-semibold block mb-1">Option D</label><input value={questionForm.optionD} onChange={(e) => setQuestionForm({ ...questionForm, optionD: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-600" /></div>

                <div>
                  <label className="text-sm font-semibold text-slate-900 mb-1 block">Correct Option</label>
                  <select
                    value={questionForm.correctOption}
                    onChange={(e) => setQuestionForm({ ...questionForm, correctOption: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-600"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-900 mb-1 block">Language Code</label>
                  <input
                    value={questionForm.languageCode}
                    onChange={(e) => setQuestionForm({ ...questionForm, languageCode: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-slate-900 mb-1 block">Explanation Text</label>
                  <textarea
                    value={questionForm.explanationText}
                    onChange={(e) => setQuestionForm({ ...questionForm, explanationText: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, isActive: !questionForm.isActive })}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold ${
                      questionForm.isActive
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    {questionForm.isActive ? <CheckSquare size={14} /> : <Square size={14} />}
                    Is Active
                  </button>
                </div>
              </div>

              {!editId && (
                <button
                  type="button"
                  onClick={addQuestionDraft}
                  className="mt-4 w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
                >
                  Save Question In Draft List
                </button>
              )}
            </div>

            {!editId && (
              <div className="mt-5 space-y-2">
                {draftQuestions.map((q, idx) => (
                  <div key={`${q.questionId}-${idx}`} className="bg-white border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-blue-700">{q.questionId}</p>
                      <p className="text-sm font-semibold text-slate-800">{q.questionText}</p>
                      <p className="text-xs font-semibold text-slate-500">
                        Correct: {q.correctOption} | {q.difficultyLevel} | Marks: {baseForm.questionMarks} | Negative: {baseForm.negativeMark}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => editDraftQuestion(idx)} className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Edit size={15} /></button>
                      <button type="button" onClick={() => removeDraftQuestion(idx)} className="p-2 bg-red-50 text-red-500 rounded-xl"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              disabled={isSaving}
              className="w-full py-4 mt-6 bg-[#0F172A] text-white rounded-2xl hover:bg-blue-600 transition-all flex justify-center items-center gap-3 text-sm font-semibold"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {editId ? "Update Question" : "Save All Draft Questions"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default MockTest;
