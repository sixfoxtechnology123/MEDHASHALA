const MockTest = require("../models/MockTest");
const mongoose = require("mongoose");
const Exam = require("../models/Exam");
const Category = require("../models/Category");
const Syllabus = require("../models/Syllabus");
const QuestionBank = require("../models/QuestionBank");
const NO_CATEGORY_ID = "NO_CATEGORY";
const NO_CATEGORY_NAME = "NO CATEGORY";

const isNoCategoryValue = (value) => {
  const v = String(value || "").trim().toUpperCase();
  return !v || v === NO_CATEGORY_ID || v === NO_CATEGORY_NAME || v === "NONE";
};

const generateNextSetId = async () => {
  const rows = await MockTest.find().select("questionSetId").lean();
  const maxNum = rows.reduce((acc, item) => {
    const n = parseInt(String(item?.questionSetId || "").replace("QSET", ""), 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, 0);
  return `QSET${maxNum + 1}`;
};

const resolveExam = async (examInput) => {
  if (!examInput) return null;
  const examByCode = await Exam.findOne({ examCode: String(examInput).trim().toUpperCase() }).select("examName examCode");
  if (examByCode) return examByCode;
  return Exam.findById(examInput).select("examName examCode");
};

const resolveCategory = async (catInput, examCode) => {
  if (!catInput) return null;
  const categoryByCode = await Category.findOne({
    catId: String(catInput).trim().toUpperCase(),
    examCode: String(examCode || "").trim().toUpperCase(),
  }).select("catName catId examCode examStage examStages");
  if (categoryByCode) return categoryByCode;
  return Category.findById(catInput).select("catName catId examCode examStage examStages");
};

const resolveSubject = async (subjectInput, examCode, catId) => {
  if (!subjectInput) return null;
  const baseQuery = {
    syllabusId: String(subjectInput).trim().toUpperCase(),
    examCode: String(examCode || "").trim().toUpperCase(),
  };
  if (isNoCategoryValue(catId)) {
    baseQuery.$or = [{ catId: { $exists: false } }, { catId: null }, { catId: "" }, { catId: NO_CATEGORY_ID }, { catId: NO_CATEGORY_NAME }];
  } else {
    baseQuery.catId = String(catId || "").trim().toUpperCase();
  }
  const subjectByCode = await Syllabus.findOne(baseQuery).select("syllabusId subjectName examCode catId");
  if (subjectByCode) return subjectByCode;
  return Syllabus.findById(subjectInput).select("syllabusId subjectName examCode catId");
};

const buildHierarchyPayload = async ({ examMasterId, examCategoryId, subjectId }) => {
  const selectedExam = await resolveExam(examMasterId);
  if (!selectedExam) throw new Error("EXAM_NOT_FOUND");

  const wantsCategory = !isNoCategoryValue(examCategoryId);
  const selectedCategory = wantsCategory ? await resolveCategory(examCategoryId, selectedExam.examCode) : null;
  if (wantsCategory && !selectedCategory) throw new Error("CATEGORY_NOT_FOUND");

  const selectedSubject = await resolveSubject(subjectId, selectedExam.examCode, selectedCategory?.catId);
  if (!selectedSubject) throw new Error("SUBJECT_NOT_FOUND");

  if (selectedCategory && (
    String(selectedCategory.examCode || "").toUpperCase() !==
    String(selectedExam.examCode || "").toUpperCase()
  )) {
    throw new Error("CATEGORY_EXAM_MISMATCH");
  }

  if (
    String(selectedSubject.examCode || "").toUpperCase() !==
      String(selectedExam.examCode || "").toUpperCase() || (
      selectedCategory
        ? String(selectedSubject.catId || "").toUpperCase() !== String(selectedCategory.catId || "").toUpperCase()
        : !isNoCategoryValue(selectedSubject.catId)
    )
  ) {
    throw new Error("SUBJECT_CATEGORY_MISMATCH");
  }

  const availableStages = Array.from(
    new Set(
      [ ...(Array.isArray(selectedCategory?.examStages) ? selectedCategory.examStages : []), selectedCategory?.examStage ]
        .map((s) => String(s || "").trim().toUpperCase())
        .filter(Boolean)
    )
  );

  return {
    examMasterId: String(selectedExam.examCode || "").toUpperCase(),
    examCategoryId: selectedCategory ? String(selectedCategory.catId || "").toUpperCase() : NO_CATEGORY_ID,
    subjectId: String(selectedSubject.syllabusId || "").toUpperCase(),
    examName: selectedExam.examName,
    examCode: selectedExam.examCode,
    examStage: availableStages[0] || undefined,
    categoryName: selectedCategory?.catName || NO_CATEGORY_NAME,
    categoryCode: selectedCategory?.catId || NO_CATEGORY_ID,
    subjectName: selectedSubject.subjectName,
  };
};

const toUpperList = (value) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : String(value || "").split(","))
        .map((item) => String(item || "").trim().toUpperCase())
        .filter(Boolean)
    )
  );

const makeQuestionId = (setId, qNo) =>
  `${String(setId || "").toUpperCase()}::${String(qNo || "").toUpperCase()}`;

const parseQuestionId = (id) => {
  const parts = String(id || "").trim().toUpperCase().split("::");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { setId: parts[0], qNo: parts[1] };
};

const flattenQuestionSet = (set) =>
  (Array.isArray(set.questions) ? set.questions : []).map((q, idx) => {
    const qNo = String(q?.qNo || `Q${idx + 1}`).toUpperCase();
    return {
      questionBankId: makeQuestionId(set.questionSetId, qNo),
      questionSetId: set.questionSetId,
      qNo,
      marks: q?.marks ?? null,
      negativeMarks: q?.negativeMarks ?? null,
      questionText: q?.questionText || "",
      optionA: q?.optionA || "",
      optionB: q?.optionB || "",
      optionC: q?.optionC || "",
      optionD: q?.optionD || "",
      correctOption: q?.correctOption || "",
      explanationText: q?.explanationText || "",
      questionImages: Array.isArray(q?.questionImages) ? q.questionImages : [],
      optionImages: q?.optionImages || { A: [], B: [], C: [], D: [] },
      explanationImages: Array.isArray(q?.explanationImages) ? q.explanationImages : [],
      examMasterId: set.examMasterId,
      examCategoryId: set.examCategoryId,
      subjectId: set.subjectId,
      examStage: set.examStage,
      topicName: set.topicName,
      subTopicName: set.subTopicName,
      examName: set.examName,
      categoryName: set.categoryName,
      subjectName: set.subjectName,
      status: set.status,
      createdAt: set.createdAt,
    };
  });

const resolveQuestionsByIds = async (questionIds) => {
  const parsed = (Array.isArray(questionIds) ? questionIds : [])
    .map(parseQuestionId)
    .filter(Boolean);
  if (!parsed.length) return [];

  const bySet = new Map();
  for (const { setId, qNo } of parsed) {
    if (!bySet.has(setId)) bySet.set(setId, new Set());
    bySet.get(setId).add(qNo);
  }

  const setIds = Array.from(bySet.keys());
  const sets = await QuestionBank.find({ questionSetId: { $in: setIds } }).lean();
  const result = [];
  for (const set of sets) {
    const want = bySet.get(String(set.questionSetId || "").toUpperCase());
    if (!want) continue;
    for (const q of flattenQuestionSet(set)) {
      if (want.has(String(q.qNo || "").toUpperCase())) {
        result.push(q);
      }
    }
  }
  return result;
};

const normalizeQuestionIds = async (questionIds) => {
  const ids = Array.isArray(questionIds) ? questionIds : [];
  const trimmed = Array.from(new Set(ids.map((item) => String(item || "").trim()).filter(Boolean)));
  if (!trimmed.length) return [];

  const parsed = trimmed.map(parseQuestionId).filter(Boolean);
  if (!parsed.length) return [];

  const resolved = await resolveQuestionsByIds(trimmed);
  return Array.from(new Set(resolved.map((q) => String(q.questionBankId).toUpperCase())));
};

const getAssignedQuestionIds = async ({ examMasterId, examCategoryId, subjectId }) => {
  const rows = await MockTest.find({
    examMasterId,
    examCategoryId,
    subjectId,
  })
    .select("questionIds")
    .lean();

  const assigned = new Set();
  for (const row of rows) {
    for (const questionId of row.questionIds || []) {
      assigned.add(String(questionId).toUpperCase());
    }
  }
  return assigned;
};

const createSetWithRetry = async (baseDoc, retries = 3) => {
  let attempts = 0;
  while (attempts <= retries) {
    try {
      return await MockTest.create(baseDoc);
    } catch (error) {
      if (error?.code === 11000 && attempts < retries) {
        const newId = await generateNextSetId();
        baseDoc.questionSetId = String(newId).toUpperCase();
        attempts += 1;
        continue;
      }
      throw error;
    }
  }
  throw new Error("CREATE_FAILED");
};

const createSetNoDuplicateError = async (payload) => {
  // Always protect against stale frontend IDs by retrying with a fresh generated ID.
  let attempts = 0;
  while (attempts < 10) {
    try {
      const forcedId = attempts === 0 && payload.questionSetId
        ? String(payload.questionSetId).toUpperCase()
        : String(await generateNextSetId()).toUpperCase();
      return await MockTest.create({
        ...payload,
        questionSetId: forcedId,
        questionId: forcedId,
      });
    } catch (error) {
      if (error?.code === 11000) {
        attempts += 1;
        continue;
      }
      throw error;
    }
  }
  throw new Error("SET_ID_RETRY_EXHAUSTED");
};

const buildQuestionBreakdown = (rows = []) => {
  const map = new Map();
  for (const q of rows) {
    const examName = String(q.examName || "").trim().toUpperCase();
    const categoryName = String(q.categoryName || "").trim().toUpperCase();
    const subjectName = String(q.subjectName || "").trim().toUpperCase();
    const topicName = String(q.topicName || "").trim().toUpperCase();
    const subTopicName = String(q.subTopicName || "").trim().toUpperCase();
    const key = [examName, categoryName, subjectName, topicName, subTopicName].join("|");
    map.set(key, {
      examName,
      categoryName,
      subjectName,
      topicName,
      subTopicName,
      count: (map.get(key)?.count || 0) + 1,
    });
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
};

exports.getNextQuestionSetId = async (req, res) => {
  try {
    const nextId = await generateNextSetId();
    res.json({ success: true, nextId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllMockTests = async (req, res) => {
  try {
    const { examMasterId, examCategoryId, subjectId, examStage, topicName, subTopicName, page = 1, limit = 10 } = req.query;
    const filter = {};
    const andFilters = [];
    const examIds = toUpperList(examMasterId);
    const categoryIds = toUpperList(examCategoryId);
    const subjectIds = toUpperList(subjectId);
    const stages = toUpperList(examStage);
    const topicNames = toUpperList(topicName);
    const subTopicNames = toUpperList(subTopicName);
    if (examIds.length) {
      andFilters.push({ $or: [{ examMasterId: { $in: examIds } }, { examMasterIds: { $in: examIds } }] });
    }
    if (categoryIds.length) {
      andFilters.push({ $or: [{ examCategoryId: { $in: categoryIds } }, { examCategoryIds: { $in: categoryIds } }] });
    }
    if (subjectIds.length) {
      andFilters.push({ $or: [{ subjectId: { $in: subjectIds } }, { subjectIds: { $in: subjectIds } }] });
    }
    if (stages.length) {
      andFilters.push({ $or: [{ examStage: { $in: stages } }, { examStages: { $in: stages } }] });
    }
    if (topicNames.length) {
      andFilters.push({ $or: [{ topicName: { $in: topicNames } }, { topicNames: { $in: topicNames } }] });
    }
    if (subTopicNames.length) {
      andFilters.push({ $or: [{ subTopicName: { $in: subTopicNames } }, { subTopicNames: { $in: subTopicNames } }] });
    }
    if (andFilters.length) filter.$and = andFilters;

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (safePage - 1) * safeLimit;

    const [rows, total] = await Promise.all([
      MockTest.find(filter).sort({ testDate: -1, createdAt: -1 }).skip(skip).limit(safeLimit),
      MockTest.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(Math.ceil(total / safeLimit), 1),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMockTestSetById = async (req, res) => {
  try {
    const row = await MockTest.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ success: false, message: "QUESTION SET NOT FOUND" });

    const questionDetails = await resolveQuestionsByIds(row.questionIds || []);

    res.json({
      success: true,
      data: {
        ...row,
        questionDetails,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.suggestQuestionsForSet = async (req, res) => {
  try {
    const { examMasterId, examCategoryId, subjectId, count = 10, forceRestart = false } = req.query;

    if (!examMasterId) return res.status(400).json({ success: false, message: "VALID EXAM REQUIRED" });
    if (!subjectId) return res.status(400).json({ success: false, message: "VALID SUBJECT REQUIRED" });

    const safeCount = Math.max(parseInt(count, 10) || 10, 1);
    const hierarchy = await buildHierarchyPayload({ examMasterId, examCategoryId, subjectId });
    const baseFilter = {
      examMasterId: hierarchy.examMasterId,
      examCategoryId: hierarchy.examCategoryId,
      subjectId: hierarchy.subjectId,
      status: "ACTIVE",
    };

    const sets = await QuestionBank.find(baseFilter).sort({ createdAt: 1 }).lean();
    const allQuestions = sets.flatMap((set) => flattenQuestionSet(set));
    if (!allQuestions.length) {
      return res.status(400).json({ success: false, message: "NO ACTIVE QUESTIONS FOUND IN QUESTION BANK" });
    }

    const assignedSet = await getAssignedQuestionIds(hierarchy);
    let available = allQuestions.filter((q) => !assignedSet.has(String(q.questionBankId).toUpperCase()));
    let exhausted = false;

    if (!available.length) {
      exhausted = true;
      if (String(forceRestart).toLowerCase() !== "true") {
        return res.status(200).json({
          success: true,
          exhausted: true,
          message: "YOU HAVE ALREADY CREATED QUESTION SETS FROM ALL QUESTIONS. DO YOU WANT TO START AGAIN FROM FIRST?",
          data: [],
        });
      }
      available = allQuestions;
    }

    res.json({
      success: true,
      exhausted,
      data: available.slice(0, safeCount),
    });
  } catch (error) {
    if (error?.message === "EXAM_NOT_FOUND") return res.status(404).json({ success: false, message: "EXAM NOT FOUND" });
    if (error?.message === "CATEGORY_NOT_FOUND") return res.status(404).json({ success: false, message: "CATEGORY NOT FOUND" });
    if (error?.message === "SUBJECT_NOT_FOUND") return res.status(404).json({ success: false, message: "SUBJECT NOT FOUND" });
    if (error?.message === "CATEGORY_EXAM_MISMATCH") {
      return res.status(400).json({ success: false, message: "CATEGORY DOES NOT BELONG TO EXAM" });
    }
    if (error?.message === "SUBJECT_CATEGORY_MISMATCH") {
      return res.status(400).json({ success: false, message: "SUBJECT DOES NOT BELONG TO CATEGORY" });
    }
    res.status(500).json({ success: false, message: error.message || "DATABASE ERROR" });
  }
};

exports.upsertMockTest = async (req, res) => {
  try {
    const {
      id,
      questionSetId,
      examMasterId,
      examCategoryId,
      subjectId,
      examMasterIds = [],
      examCategoryIds = [],
      examStages = [],
      subjectIds = [],
      topicNames = [],
      subTopicNames = [],
      testDate,
      status = "ACTIVE",
      isActive = true,
      isSelectedForAttempt = false,
      questionIds = [],
    } = req.body;

    const normalizedExamMasterIds = toUpperList(examMasterIds.length ? examMasterIds : examMasterId);
    const normalizedExamCategoryIds = toUpperList(examCategoryIds.length ? examCategoryIds : examCategoryId);
    const normalizedExamStages = toUpperList(examStages);
    const normalizedSubjectIds = toUpperList(subjectIds.length ? subjectIds : subjectId);
    const normalizedTopicNames = toUpperList(topicNames);
    const normalizedSubTopicNames = toUpperList(subTopicNames);

    if (!normalizedExamMasterIds.length) return res.status(400).json({ success: false, message: "VALID EXAM REQUIRED" });
    if (!normalizedSubjectIds.length) return res.status(400).json({ success: false, message: "VALID SUBJECT REQUIRED" });
    if (!testDate) return res.status(400).json({ success: false, message: "TEST DATE REQUIRED" });

    const cleanedQuestionIds = await normalizeQuestionIds(questionIds);

    if (!cleanedQuestionIds.length) {
      return res.status(400).json({ success: false, message: "SELECT AT LEAST ONE QUESTION" });
    }

    const bankQuestionsRaw = await resolveQuestionsByIds(cleanedQuestionIds);
    const bankQuestions = bankQuestionsRaw.filter((q) =>
      normalizedExamMasterIds.includes(String(q.examMasterId || "").toUpperCase()) &&
      normalizedSubjectIds.includes(String(q.subjectId || "").toUpperCase()) &&
      (!normalizedExamCategoryIds.length || normalizedExamCategoryIds.includes(String(q.examCategoryId || NO_CATEGORY_ID).toUpperCase())) &&
      (!normalizedExamStages.length || normalizedExamStages.includes(String(q.examStage || "").toUpperCase())) &&
      (!normalizedTopicNames.length || normalizedTopicNames.includes(String(q.topicName || "").toUpperCase())) &&
      (!normalizedSubTopicNames.length || normalizedSubTopicNames.includes(String(q.subTopicName || "").toUpperCase()))
    );

    if (bankQuestions.length !== cleanedQuestionIds.length) {
      return res.status(400).json({ success: false, message: "INVALID QUESTION SELECTION FOR SUBJECT" });
    }

    const finalExamMasterIds = Array.from(new Set(bankQuestions.map((q) => String(q.examMasterId || "").toUpperCase()).filter(Boolean)));
    const finalExamCategoryIds = Array.from(new Set(bankQuestions.map((q) => String(q.examCategoryId || NO_CATEGORY_ID).toUpperCase()).filter(Boolean)));
    const finalSubjectIds = Array.from(new Set(bankQuestions.map((q) => String(q.subjectId || "").toUpperCase()).filter(Boolean)));
    const finalExamStages = Array.from(new Set(bankQuestions.map((q) => String(q.examStage || "").toUpperCase()).filter(Boolean)));
    const finalTopicNames = Array.from(new Set(bankQuestions.map((q) => String(q.topicName || "").toUpperCase()).filter(Boolean)));
    const finalSubTopicNames = Array.from(new Set(bankQuestions.map((q) => String(q.subTopicName || "").toUpperCase()).filter(Boolean)));
    const examNames = Array.from(new Set(bankQuestions.map((q) => String(q.examName || "").trim()).filter(Boolean)));
    const categoryNames = Array.from(new Set(bankQuestions.map((q) => String(q.categoryName || NO_CATEGORY_NAME).trim()).filter(Boolean)));
    const subjectNames = Array.from(new Set(bankQuestions.map((q) => String(q.subjectName || "").trim()).filter(Boolean)));

    const payload = {
      examMasterId: finalExamMasterIds[0],
      examCategoryId: finalExamCategoryIds[0] || NO_CATEGORY_ID,
      subjectId: finalSubjectIds[0],
      examName: examNames.join(", "),
      examCode: finalExamMasterIds[0],
      examStage: finalExamStages[0] || undefined,
      categoryName: categoryNames.join(", ") || NO_CATEGORY_NAME,
      categoryCode: finalExamCategoryIds[0] || NO_CATEGORY_ID,
      subjectName: subjectNames.join(", "),
      topicName: finalTopicNames[0] || undefined,
      subTopicName: finalSubTopicNames[0] || undefined,
      examMasterIds: finalExamMasterIds,
      examCategoryIds: finalExamCategoryIds,
      examStages: finalExamStages,
      subjectIds: finalSubjectIds,
      topicNames: finalTopicNames,
      subTopicNames: finalSubTopicNames,
      questionBreakdown: buildQuestionBreakdown(bankQuestions),
      testDate: new Date(testDate),
      status: String(status || "").toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      isActive: Boolean(isActive) && String(status || "").toUpperCase() !== "INACTIVE",
      isSelectedForAttempt:
        Boolean(isSelectedForAttempt) && String(status || "").toUpperCase() !== "INACTIVE",
      questionIds: bankQuestions.map((q) => String(q.questionBankId).toUpperCase()),
    };

    if (id) {
      if (payload.isSelectedForAttempt) {
        await MockTest.updateMany(
          {
            subjectId: payload.subjectId,
            _id: { $ne: id },
          },
          { $set: { isSelectedForAttempt: false } }
        );
      }
      const updated = await MockTest.findByIdAndUpdate(
        id,
        { $set: { ...payload, questionId: String(questionSetId || "").toUpperCase() || undefined } },
        { new: true }
      );
      if (!updated) return res.status(404).json({ success: false, message: "QUESTION SET NOT FOUND" });
      return res.json({ success: true, data: updated });
    }

    if (payload.isSelectedForAttempt) {
      await MockTest.updateMany(
        {
          subjectId: payload.subjectId,
        },
        { $set: { isSelectedForAttempt: false } }
      );
    }

    const created = await createSetNoDuplicateError({
      questionSetId: questionSetId ? String(questionSetId).toUpperCase() : "",
      ...payload,
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error?.message === "EXAM_NOT_FOUND") return res.status(404).json({ success: false, message: "EXAM NOT FOUND" });
    if (error?.message === "CATEGORY_NOT_FOUND") return res.status(404).json({ success: false, message: "CATEGORY NOT FOUND" });
    if (error?.message === "SUBJECT_NOT_FOUND") return res.status(404).json({ success: false, message: "SUBJECT NOT FOUND" });
    if (error?.message === "CATEGORY_EXAM_MISMATCH") {
      return res.status(400).json({ success: false, message: "CATEGORY DOES NOT BELONG TO EXAM" });
    }
    if (error?.message === "SUBJECT_CATEGORY_MISMATCH") {
      return res.status(400).json({ success: false, message: "SUBJECT DOES NOT BELONG TO CATEGORY" });
    }
    if (error?.code === 11000) {
      const dupKey = String(error?.message || "");
      if (dupKey.includes("questionId")) {
        return res.status(409).json({
          success: false,
          message: "LEGACY DUPLICATE INDEX ON questionId DETECTED. PLEASE CONTACT ADMIN FOR DB INDEX CLEANUP.",
        });
      }
      return res.status(409).json({ success: false, message: "QUESTION SET ID ALREADY EXISTS" });
    }
    if (error?.message === "SET_ID_RETRY_EXHAUSTED") {
      return res.status(500).json({ success: false, message: "FAILED TO GENERATE UNIQUE QUESTION SET ID" });
    }
    res.status(500).json({ success: false, message: error.message || "DATABASE ERROR" });
  }
};

exports.deleteMockTest = async (req, res) => {
  try {
    await MockTest.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "DELETED" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAttemptQuestions = async (req, res) => {
  try {
    const { subjectId, questionSetId } = req.query;
    if (!subjectId) return res.status(400).json({ success: false, message: "VALID SUBJECT REQUIRED" });

    let normalizedSubjectId = String(subjectId).toUpperCase();
    if (mongoose.isValidObjectId(subjectId)) {
      const subjectByMongo = await Syllabus.findById(subjectId).select("syllabusId").lean();
      if (subjectByMongo?.syllabusId) {
        normalizedSubjectId = String(subjectByMongo.syllabusId).toUpperCase();
      }
    }

    const filter = {
      subjectId: normalizedSubjectId,
      status: "ACTIVE",
      isActive: true,
      isSelectedForAttempt: true,
    };
    if (questionSetId) filter.questionSetId = String(questionSetId).toUpperCase();

    const selectedSet = await MockTest.findOne(filter).sort({ testDate: -1, createdAt: -1 }).lean();
    if (!selectedSet) {
      return res.json({ success: true, data: [], set: null });
    }

    const rows = (await resolveQuestionsByIds(selectedSet.questionIds || []))
      .filter((q) => String(q.status || "").toUpperCase() === "ACTIVE");

    const questions = rows.map((q) => ({
      _id: q.questionBankId,
      questionBankId: q.questionBankId,
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      explanationText: q.explanationText,
      questionImages: Array.isArray(q.questionImages) ? q.questionImages : [],
      optionImages: q.optionImages || { A: [], B: [], C: [], D: [] },
      explanationImages: Array.isArray(q.explanationImages) ? q.explanationImages : [],
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      subjectName: q.subjectName,
    }));

    res.json({
      success: true,
      set: {
        id: selectedSet._id,
        questionSetId: selectedSet.questionSetId,
        testDate: selectedSet.testDate,
        subjectName: selectedSet.subjectName,
      },
      data: questions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "DATABASE ERROR" });
  }
};

exports.selectSetForStudent = async (req, res) => {
  try {
    const makeSelected = String(req.body?.selected).toLowerCase() !== "false";
    const target = await MockTest.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: "QUESTION SET NOT FOUND" });

    if (makeSelected) {
      await MockTest.updateMany(
        {
          subjectId: target.subjectId,
        },
        { $set: { isSelectedForAttempt: false } }
      );
      target.isSelectedForAttempt = true;
      target.status = "ACTIVE";
      target.isActive = true;
    } else {
      target.isSelectedForAttempt = false;
    }
    await target.save();

    return res.json({
      success: true,
      data: target,
      message: makeSelected ? "SET SELECTED FOR STUDENT ATTEMPT" : "SET DESELECTED",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "DATABASE ERROR" });
  }
};
