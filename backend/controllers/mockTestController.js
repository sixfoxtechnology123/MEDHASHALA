const MockTest = require("../models/MockTest");
const mongoose = require("mongoose");
const Exam = require("../models/Exam");
const Category = require("../models/Category");
const Syllabus = require("../models/Syllabus");
const QuestionBank = require("../models/QuestionBank");

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
  }).select("catName catId examCode");
  if (categoryByCode) return categoryByCode;
  return Category.findById(catInput).select("catName catId examCode");
};

const resolveSubject = async (subjectInput, examCode, catId) => {
  if (!subjectInput) return null;
  const subjectByCode = await Syllabus.findOne({
    syllabusId: String(subjectInput).trim().toUpperCase(),
    examCode: String(examCode || "").trim().toUpperCase(),
    catId: String(catId || "").trim().toUpperCase(),
  }).select("syllabusId subjectName examCode catId");
  if (subjectByCode) return subjectByCode;
  return Syllabus.findById(subjectInput).select("syllabusId subjectName examCode catId");
};

const buildHierarchyPayload = async ({ examMasterId, examCategoryId, subjectId }) => {
  const selectedExam = await resolveExam(examMasterId);
  if (!selectedExam) throw new Error("EXAM_NOT_FOUND");

  const selectedCategory = await resolveCategory(examCategoryId, selectedExam.examCode);
  if (!selectedCategory) throw new Error("CATEGORY_NOT_FOUND");

  const selectedSubject = await resolveSubject(subjectId, selectedExam.examCode, selectedCategory.catId);
  if (!selectedSubject) throw new Error("SUBJECT_NOT_FOUND");

  if (
    String(selectedCategory.examCode || "").toUpperCase() !==
    String(selectedExam.examCode || "").toUpperCase()
  ) {
    throw new Error("CATEGORY_EXAM_MISMATCH");
  }

  if (
    String(selectedSubject.examCode || "").toUpperCase() !==
      String(selectedExam.examCode || "").toUpperCase() ||
    String(selectedSubject.catId || "").toUpperCase() !==
      String(selectedCategory.catId || "").toUpperCase()
  ) {
    throw new Error("SUBJECT_CATEGORY_MISMATCH");
  }

  return {
    examMasterId: String(selectedExam.examCode || "").toUpperCase(),
    examCategoryId: String(selectedCategory.catId || "").toUpperCase(),
    subjectId: String(selectedSubject.syllabusId || "").toUpperCase(),
    examName: selectedExam.examName,
    examCode: selectedExam.examCode,
    categoryName: selectedCategory.catName,
    categoryCode: selectedCategory.catId,
    subjectName: selectedSubject.subjectName,
  };
};

const normalizeQuestionIds = async (questionIds) => {
  const ids = Array.isArray(questionIds) ? questionIds : [];
  const trimmed = Array.from(new Set(ids.map((item) => String(item || "").trim()).filter(Boolean)));
  if (!trimmed.length) return [];

  const byBusinessIds = await QuestionBank.find({ questionBankId: { $in: trimmed.map((v) => v.toUpperCase()) } })
    .select("questionBankId")
    .lean();
  const foundMap = new Set(byBusinessIds.map((q) => String(q.questionBankId).toUpperCase()));

  if (foundMap.size === trimmed.length) {
    return trimmed.map((v) => v.toUpperCase());
  }

  const byMongoIds = await QuestionBank.find({ _id: { $in: trimmed } }).select("questionBankId").lean();
  const merged = new Set([...foundMap, ...byMongoIds.map((q) => String(q.questionBankId).toUpperCase())]);
  return Array.from(merged);
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
    const { examMasterId, examCategoryId, subjectId, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (examMasterId) filter.examMasterId = String(examMasterId).toUpperCase();
    if (examCategoryId) filter.examCategoryId = String(examCategoryId).toUpperCase();
    if (subjectId) filter.subjectId = String(subjectId).toUpperCase();

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

    const questionDetails = await QuestionBank.find({
      questionBankId: { $in: (row.questionIds || []).map((v) => String(v).toUpperCase()) },
    })
      .sort({ createdAt: 1 })
      .lean();

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
    if (!examCategoryId) return res.status(400).json({ success: false, message: "VALID CATEGORY REQUIRED" });
    if (!subjectId) return res.status(400).json({ success: false, message: "VALID SUBJECT REQUIRED" });

    const safeCount = Math.max(parseInt(count, 10) || 10, 1);
    const hierarchy = await buildHierarchyPayload({ examMasterId, examCategoryId, subjectId });
    const baseFilter = {
      examMasterId: hierarchy.examMasterId,
      examCategoryId: hierarchy.examCategoryId,
      subjectId: hierarchy.subjectId,
      status: "ACTIVE",
    };

    const allQuestions = await QuestionBank.find(baseFilter).sort({ createdAt: 1 }).lean();
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
      testDate,
      status = "ACTIVE",
      isActive = true,
      isSelectedForAttempt = false,
      questionIds = [],
    } = req.body;

    if (!examMasterId) return res.status(400).json({ success: false, message: "VALID EXAM REQUIRED" });
    if (!examCategoryId) return res.status(400).json({ success: false, message: "VALID CATEGORY REQUIRED" });
    if (!subjectId) return res.status(400).json({ success: false, message: "VALID SUBJECT REQUIRED" });
    if (!testDate) return res.status(400).json({ success: false, message: "TEST DATE REQUIRED" });

    const hierarchy = await buildHierarchyPayload({ examMasterId, examCategoryId, subjectId });
    const cleanedQuestionIds = await normalizeQuestionIds(questionIds);

    if (!cleanedQuestionIds.length) {
      return res.status(400).json({ success: false, message: "SELECT AT LEAST ONE QUESTION" });
    }

    const bankQuestions = await QuestionBank.find({
      questionBankId: { $in: cleanedQuestionIds },
      examMasterId: hierarchy.examMasterId,
      examCategoryId: hierarchy.examCategoryId,
      subjectId: hierarchy.subjectId,
    }).select("questionBankId");

    if (bankQuestions.length !== cleanedQuestionIds.length) {
      return res.status(400).json({ success: false, message: "INVALID QUESTION SELECTION FOR SUBJECT" });
    }

    const payload = {
      ...hierarchy,
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
            subjectId: hierarchy.subjectId,
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
          subjectId: hierarchy.subjectId,
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

    const rows = await QuestionBank.find({
      questionBankId: { $in: (selectedSet.questionIds || []).map((v) => String(v).toUpperCase()) },
      status: "ACTIVE",
    })
      .sort({ createdAt: 1 })
      .lean();

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
