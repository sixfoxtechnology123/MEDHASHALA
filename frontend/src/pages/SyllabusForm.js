import React, { useEffect, useMemo, useState } from "react";
import { BookCopy, Edit, Loader2, Plus, RefreshCw, Save, Trash2, X, PlusCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "../api/axios";

const emptyTopic = { topicName: "", subTopicInput: "", subTopics: [] };
const emptyBulkTopic = { topicName: "", subTopicInput: "", subTopics: [] };

const SyllabusForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [syllabusRows, setSyllabusRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    syllabusId: "",
    examId: "",
    examStage: "",
    categoryId: "",
    subjectName: "",
    status: "ACTIVE",
    topics: [],
  });
  const [currentTopic, setCurrentTopic] = useState({ ...emptyTopic });

  const [copyEnabled, setCopyEnabled] = useState(false);
  const [copyFromStage, setCopyFromStage] = useState("");
  const [bulkSubjects, setBulkSubjects] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchBase = async () => {
    setLoading(true);
    try {
      const [examRes, catRes, sylRes, idRes] = await Promise.allSettled([
        axios.get("/master/exam"),
        axios.get("/master/category/all"),
        axios.get("/master/syllabus/all"),
        axios.get("/master/syllabus/next-id"),
      ]);

      const examList = examRes.status === "fulfilled"
        ? (Array.isArray(examRes.value.data) ? examRes.value.data : examRes.value.data?.data || [])
        : [];
      const catList = catRes.status === "fulfilled"
        ? (Array.isArray(catRes.value.data) ? catRes.value.data : catRes.value.data?.data || [])
        : [];
      const syllabusList = sylRes.status === "fulfilled"
        ? (Array.isArray(sylRes.value.data) ? sylRes.value.data : sylRes.value.data?.data || [])
        : [];

      setExams(examList);
      setCategories(catList);
      setSyllabusRows(syllabusList);

      if (!isEdit && idRes.status === "fulfilled" && idRes.value.data?.nextId) {
        setFormData((prev) => ({ ...prev, syllabusId: idRes.value.data.nextId }));
      }

      if (isEdit) {
        const res = await axios.get(`/master/syllabus/${id}`);
        const row = res.data?.data;
        if (!row) {
          toast.error("SYLLABUS NOT FOUND");
          navigate("/dashboard/syllabus-master");
          return;
        }

        const exam = examList.find(
          (ex) => String(ex._id) === String(row.examId) || String(ex.examCode || "").toUpperCase() === String(row.examCode || "").toUpperCase()
        );
        const cat = catList.find(
          (c) =>
            String(c._id) === String(row.categoryId) ||
            (String(c.catId || "").toUpperCase() === String(row.catId || "").toUpperCase() &&
              String(c.examCode || "").toUpperCase() === String(row.examCode || "").toUpperCase())
        );

        setFormData({
          syllabusId: row.syllabusId || "",
          examId: exam?._id || "",
          examStage: row.examStage || cat?.examStage || "",
          categoryId: cat?._id || "",
          subjectName: row.subjectName || "",
          status: row.status || "ACTIVE",
          topics: (row.topics || []).map((t) => ({
            topicName: t.topicName || "",
            subTopics: t.subTopics || [],
          })),
        });
        setCurrentTopic({ ...emptyTopic });
        setCopyEnabled(false);
        setCopyFromStage("");
        setBulkSubjects([]);
        setBulkLoading(false);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "DATABASE SYNC FAILED");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const filteredCategories = useMemo(() => {
    const selectedExam = exams.find((ex) => String(ex._id) === String(formData.examId));
    if (!selectedExam) return [];
    return categories.filter(
      (cat) => String(cat.examCode || "").toUpperCase() === String(selectedExam.examCode || "").toUpperCase()
    );
  }, [categories, exams, formData.examId]);

  const selectedExamForForm = useMemo(
    () => exams.find((ex) => String(ex._id) === String(formData.examId)) || null,
    [exams, formData.examId]
  );

  const selectedCategoryForForm = useMemo(
    () => categories.find((cat) => String(cat._id) === String(formData.categoryId)) || null,
    [categories, formData.categoryId]
  );

  const stageOptionsForForm = useMemo(() => {
    const selectedCategory = categories.find((cat) => String(cat._id) === String(formData.categoryId));
    return Array.from(
      new Set(
        [ ...(Array.isArray(selectedCategory?.examStages) ? selectedCategory.examStages : []), selectedCategory?.examStage ]
          .map((stage) => String(stage || "").trim().toUpperCase())
          .filter(Boolean)
      )
    );
  }, [categories, formData.categoryId]);

  const existingStagesForCopy = useMemo(() => {
    if (isEdit) return [];
    const examCode = String(selectedExamForForm?.examCode || "").trim().toUpperCase();
    const catId = String(selectedCategoryForForm?.catId || "").trim().toUpperCase();
    const targetStage = String(formData.examStage || "").trim().toUpperCase();
    if (!examCode) return [];

    const stages = new Set();
    syllabusRows.forEach((row) => {
      if (String(row.examCode || "").trim().toUpperCase() !== examCode) return;
      if (String(row.catId || "").trim().toUpperCase() !== catId) return;
      const st = String(row.examStage || "").trim().toUpperCase();
      if (st) stages.add(st);
    });

    return Array.from(stages)
      .filter((st) => !targetStage || st !== targetStage)
      .sort();
  }, [formData.examStage, isEdit, selectedCategoryForForm?.catId, selectedExamForForm?.examCode, syllabusRows]);

  const canCopyFromStage = useMemo(() => {
    const targetStage = String(formData.examStage || "").trim();
    return !isEdit && !!selectedExamForForm && !!selectedCategoryForForm && !!targetStage && existingStagesForCopy.length > 0;
  }, [existingStagesForCopy.length, formData.examStage, isEdit, selectedCategoryForForm, selectedExamForForm]);

  const resetCopyState = () => {
    setCopyEnabled(false);
    setCopyFromStage("");
    setBulkSubjects([]);
    setBulkLoading(false);
  };

  const fetchStageTemplate = async (stage) => {
    const examCode = String(selectedExamForForm?.examCode || "").trim().toUpperCase();
    const catId = String(selectedCategoryForForm?.catId || "").trim().toUpperCase();
    const fromStage = String(stage || "").trim().toUpperCase();
    if (!examCode || !fromStage) return;

    setBulkLoading(true);
    try {
      const res = await axios.get("/master/syllabus/all", {
        params: { examCode, catId, examStage: fromStage },
      });
      const rows = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const next = (rows || []).map((r) => ({
        key: String(r._id || `${r.subjectName}-${Math.random()}`),
        subjectName: String(r.subjectName || "").toUpperCase(),
        topics: (r.topics || []).map((t) => ({
          topicName: String(t.topicName || "").toUpperCase(),
          subTopics: (t.subTopics || []).map((s) => String(s || "").toUpperCase()),
          subTopicInput: "",
        })),
      }));
      setBulkSubjects(next);
      toast.success(`FETCHED ${next.length} SUBJECT(S)`);
    } catch (err) {
      setBulkSubjects([]);
      toast.error(err?.response?.data?.message || "FAILED TO FETCH STAGE DATA");
    } finally {
      setBulkLoading(false);
    }
  };

  const updateBulkSubject = (index, patch) => {
    setBulkSubjects((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const addBulkSubject = () => {
    setBulkSubjects((prev) => [
      ...prev,
      { key: `new-${Date.now()}-${Math.random()}`, subjectName: "", topics: [] },
    ]);
  };

  const removeBulkSubject = (index) => {
    setBulkSubjects((prev) => prev.filter((_, i) => i !== index));
  };

  const addBulkTopic = (subjectIndex) => {
    setBulkSubjects((prev) =>
      prev.map((s, i) =>
        i === subjectIndex ? { ...s, topics: [ ...(s.topics || []), { ...emptyBulkTopic } ] } : s
      )
    );
  };

  const removeBulkTopic = (subjectIndex, topicIndex) => {
    setBulkSubjects((prev) =>
      prev.map((s, i) =>
        i === subjectIndex ? { ...s, topics: (s.topics || []).filter((_, tIdx) => tIdx !== topicIndex) } : s
      )
    );
  };

  const updateBulkTopic = (subjectIndex, topicIndex, patch) => {
    setBulkSubjects((prev) =>
      prev.map((s, i) => {
        if (i !== subjectIndex) return s;
        const topics = (s.topics || []).map((t, tIdx) => (tIdx === topicIndex ? { ...t, ...patch } : t));
        return { ...s, topics };
      })
    );
  };

  const addBulkSubTopic = (subjectIndex, topicIndex) => {
    setBulkSubjects((prev) =>
      prev.map((s, i) => {
        if (i !== subjectIndex) return s;
        const topics = (s.topics || []).map((t, tIdx) => {
          if (tIdx !== topicIndex) return t;
          const value = String(t.subTopicInput || "").trim().toUpperCase();
          if (!value) return t;
          return { ...t, subTopics: [ ...(t.subTopics || []), value ], subTopicInput: "" };
        });
        return { ...s, topics };
      })
    );
  };

  const removeBulkSubTopic = (subjectIndex, topicIndex, subIndex) => {
    setBulkSubjects((prev) =>
      prev.map((s, i) => {
        if (i !== subjectIndex) return s;
        const topics = (s.topics || []).map((t, tIdx) => {
          if (tIdx !== topicIndex) return t;
          return { ...t, subTopics: (t.subTopics || []).filter((_, sIdx) => sIdx !== subIndex) };
        });
        return { ...s, topics };
      })
    );
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

    if (copyEnabled) {
      if (!String(formData.examStage || "").trim()) return toast.error("PLEASE SELECT STAGE");
      if (!Array.isArray(bulkSubjects) || bulkSubjects.length === 0) return toast.error("NO SUBJECTS TO SAVE");
    } else {
      if (!formData.subjectName.trim()) return toast.error("PLEASE ENTER SUBJECT NAME");
      if (formData.topics.length === 0) return toast.error("PLEASE SAVE AT LEAST ONE TOPIC");
    }

    setIsSaving(true);
    try {
      if (copyEnabled) {
        const payload = {
          examId: formData.examId,
          categoryId: formData.categoryId || undefined,
          examStage: String(formData.examStage || "").trim().toUpperCase(),
          status: formData.status,
          subjects: bulkSubjects.map((s) => ({
            subjectName: String(s.subjectName || "").trim().toUpperCase(),
            topics: (s.topics || [])
              .map((t) => ({
                topicName: String(t.topicName || "").trim().toUpperCase(),
                subTopics: [
                  ...((t.subTopics || []).map((x) => String(x || "").trim().toUpperCase()).filter(Boolean)),
                  ...(String(t.subTopicInput || "").trim() ? [String(t.subTopicInput || "").trim().toUpperCase()] : []),
                ],
              }))
              .filter((t) => t.topicName),
          })),
        };

        const res = await axios.post("/master/syllabus/bulk-create", payload);
        if (res.data.success) {
          toast.success(`SAVED ${res.data?.count || payload.subjects.length}`);
          navigate("/dashboard/syllabus-master");
        }
      } else {
        const payload = {
          id: isEdit ? id : undefined,
          syllabusId: formData.syllabusId,
          examId: formData.examId,
          examStage: formData.examStage || undefined,
          categoryId: formData.categoryId || undefined,
          subjectName: formData.subjectName.toUpperCase(),
          topics: formData.topics,
          status: formData.status,
        };
        const res = await axios.post("/master/syllabus/upsert", payload);
        if (res.data.success) {
          toast.success(isEdit ? "UPDATED" : "SAVED");
          navigate("/dashboard/syllabus-master");
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "SAVE FAILED");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F7FF]">
      <header className="p-2 space-y-2">
        <div className="bg-white px-4 py-3 rounded-[24px] border border-slate-200 shadow-sm flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{isEdit ? "Update Syllabus" : "New Syllabus"}</h1>
            <p className="text-xs text-slate-500">ID: <span className="font-semibold text-blue-700">{formData.syllabusId || "--"}</span></p>
          </div>
          <button type="button" onClick={() => navigate("/dashboard/syllabus-master")} className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-700">Back</button>
        </div>
      </header>

      <section className="px-3 pb-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-900 mb-1 block">Syllabus ID</label>
              <input value={formData.syllabusId} readOnly className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[11px] text-blue-600" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-900 mb-1 block">Status</label>
              <select value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-[11px]">
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-900 mb-1 block">Exam</label>
              <select
                value={formData.examId}
                onChange={(e) => {
                  resetCopyState();
                  setFormData({ ...formData, examId: e.target.value, categoryId: "", examStage: "" });
                }}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-[11px]"
              >
                <option value="">-- SELECT EXAM --</option>
                {exams.map((ex) => (
                  <option key={ex._id} value={ex._id}>{ex.examName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-900 mb-1 block">Category Name</label>
              <select
                value={formData.categoryId}
                onChange={(e) => {
                  resetCopyState();
                  setFormData({ ...formData, categoryId: e.target.value, examStage: "" });
                }}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-[11px]"
              >
                <option value="">-- SELECT CATEGORY --</option>
                <option value="">NO CATEGORY</option>
                {filteredCategories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.catName}</option>
                ))}
              </select>
            </div>
            {stageOptionsForForm.length > 0 && (
              <div>
                <label className="text-[11px] font-bold text-slate-900 mb-1 block">Exam Stage</label>
                <select
                  value={formData.examStage}
                  onChange={(e) => {
                    resetCopyState();
                    setFormData({ ...formData, examStage: e.target.value });
                  }}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-[11px]"
                >
                  <option value="">-- SELECT STAGE --</option>
                  {stageOptionsForForm.map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {canCopyFromStage && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <label className="flex items-center gap-2 text-[11px] font-bold uppercase text-slate-900">
                  <input
                    type="checkbox"
                    checked={copyEnabled}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setCopyEnabled(next);
                      if (!next) {
                        setCopyFromStage("");
                        setBulkSubjects([]);
                        return;
                      }
                      const defaultStage = existingStagesForCopy[0] || "";
                      setCopyFromStage(defaultStage);
                      if (defaultStage) fetchStageTemplate(defaultStage);
                    }}
                    className="h-4 w-4 accent-blue-600"
                  />
                  Copy From Existing Stage
                </label>

                {copyEnabled && (
                  <div className="flex items-center gap-2">
                    <select
                      value={copyFromStage}
                      onChange={(e) => {
                        const stage = e.target.value;
                        setCopyFromStage(stage);
                        setBulkSubjects([]);
                        if (stage) fetchStageTemplate(stage);
                      }}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-[11px] outline-none focus:border-blue-600"
                    >
                      <option value="">-- SELECT SOURCE STAGE --</option>
                      {existingStagesForCopy.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={!copyFromStage || bulkLoading}
                      onClick={() => fetchStageTemplate(copyFromStage)}
                      className="px-3 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase disabled:opacity-50"
                    >
                      {bulkLoading ? "Fetching..." : "Refetch"}
                    </button>
                  </div>
                )}
              </div>

              {copyEnabled && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-700">
                      Subjects to create in stage: <span className="font-bold text-slate-900">{String(formData.examStage || "").toUpperCase()}</span>
                    </p>
                    <button type="button" onClick={addBulkSubject} className="px-3 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-bold uppercase">Add Subject</button>
                  </div>

                  {bulkSubjects.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-50 text-[11px] font-bold text-slate-600">No subjects loaded.</div>
                  ) : (
                    bulkSubjects.map((sub, sIdx) => (
                      <div key={sub.key || sIdx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={sub.subjectName || ""}
                            onChange={(e) => updateBulkSubject(sIdx, { subjectName: e.target.value.toUpperCase() })}
                            placeholder="SUBJECT NAME"
                            className="flex-1 p-3 border border-slate-200 rounded-xl font-bold text-[11px] outline-none focus:border-blue-600 bg-white"
                          />
                          <button type="button" onClick={() => removeBulkSubject(sIdx)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold text-slate-700">Topics</p>
                          <button type="button" onClick={() => addBulkTopic(sIdx)} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase">Add Topic</button>
                        </div>

                        {(sub.topics || []).length === 0 ? (
                          <div className="p-3 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-600">No topics yet.</div>
                        ) : (
                          (sub.topics || []).map((t, tIdx) => (
                            <div key={`${sub.key || sIdx}-t-${tIdx}`} className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={t.topicName || ""}
                                  onChange={(e) => updateBulkTopic(sIdx, tIdx, { topicName: e.target.value.toUpperCase() })}
                                  placeholder="TOPIC NAME"
                                  className="flex-1 p-3 border border-slate-200 rounded-xl font-bold text-[11px] outline-none focus:border-blue-600"
                                />
                                <button type="button" onClick={() => removeBulkTopic(sIdx, tIdx)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><X size={16} /></button>
                              </div>

                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={t.subTopicInput || ""}
                                  onChange={(e) => updateBulkTopic(sIdx, tIdx, { subTopicInput: e.target.value.toUpperCase() })}
                                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBulkSubTopic(sIdx, tIdx); } }}
                                  placeholder="SUB TOPIC NAME"
                                  className="flex-1 p-3 border border-slate-200 rounded-xl font-bold text-[11px] outline-none focus:border-blue-600"
                                />
                                <button type="button" onClick={() => addBulkSubTopic(sIdx, tIdx)} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"><Plus size={14} /></button>
                              </div>

                              {(t.subTopics || []).length > 0 && (
                                <ol className="list-[lower-roman] list-inside text-[11px] font-bold text-slate-700">
                                  {(t.subTopics || []).map((subt, stIdx) => (
                                    <li key={`${sub.key || sIdx}-t-${tIdx}-st-${stIdx}`} className="flex items-center justify-between uppercase">
                                      <span>{subt}</span>
                                      <button type="button" onClick={() => removeBulkSubTopic(sIdx, tIdx, stIdx)} className="text-red-500 hover:text-red-700"><X size={12} /></button>
                                    </li>
                                  ))}
                                </ol>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {!copyEnabled && (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-900 mb-1 block">Subject Name</label>
                <input
                  type="text"
                  value={formData.subjectName}
                  onChange={(e) => setFormData({ ...formData, subjectName: e.target.value.toUpperCase() })}
                  className="w-full p-3 border border-slate-200 rounded-xl font-bold text-[11px] outline-none focus:border-blue-600"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-900 block">Topic + Sub Topic</label>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="TOPIC NAME"
                      value={currentTopic.topicName}
                      onChange={(e) => setCurrentTopic((prev) => ({ ...prev, topicName: e.target.value.toUpperCase() }))}
                      className="flex-1 p-3 border border-slate-200 rounded-xl font-bold text-[11px] outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="SUB TOPIC NAME"
                      value={currentTopic.subTopicInput}
                      onChange={(e) => setCurrentTopic((prev) => ({ ...prev, subTopicInput: e.target.value.toUpperCase() }))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubTopicToCurrent(); } }}
                      className="flex-1 p-3 border border-slate-200 rounded-xl font-bold text-[11px] outline-none focus:border-blue-600"
                    />
                    <button type="button" onClick={addSubTopicToCurrent} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600"><Plus size={14} /></button>
                  </div>

                  {currentTopic.topicName && (
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[11px] font-bold text-slate-900">{currentTopic.topicName}</p>
                      <ol className="list-[lower-roman] list-inside mt-1 text-[11px] font-bold text-slate-700">
                        {(currentTopic.subTopics || []).map((sub, sIdx) => (
                          <li key={`draft-sub-${sIdx}`} className="flex items-center justify-between uppercase">
                            <span>{sub}</span>
                            <button type="button" onClick={() => removeCurrentSubTopic(sIdx)} className="text-red-500 hover:text-red-700"><X size={12} /></button>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <button type="button" onClick={saveTopicDraft} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-[10px] font-bold uppercase">
                    <PlusCircle size={14} />
                    Save Topic
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.topics.map((topic, idx) => (
                    <div key={`saved-topic-${idx}`} className="bg-white border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-slate-900">{topic.topicName}</p>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => editSavedTopic(idx)} className="p-1 rounded text-blue-600 hover:bg-blue-50"><Edit size={14} /></button>
                          <button type="button" onClick={() => removeSavedTopic(idx)} className="p-1 rounded text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <ol className="list-[lower-roman] list-inside mt-1 text-[11px] font-bold text-slate-700">
                        {(topic.subTopics || []).map((sub, sIdx) => (
                          <li key={`saved-sub-${idx}-${sIdx}`} className="uppercase">{sub}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <button disabled={isSaving || loading} className="w-full py-2 mt-2 bg-[#0F172A] text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all flex justify-center items-center gap-3">
            {isSaving ? <Loader2 className="animate-spin" size={15} /> : <Save size={18} />}
            {isEdit ? "Update" : "Save"}
          </button>
        </form>
      </section>
    </div>
  );
};

export default SyllabusForm;
