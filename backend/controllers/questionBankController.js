const QuestionBank = require("../models/QuestionBank");
const Exam = require("../models/Exam");
const Category = require("../models/Category");
const Syllabus = require("../models/Syllabus");
const NO_CATEGORY_ID = "NO_CATEGORY";
const NO_CATEGORY_NAME = "NO CATEGORY";

const isNoCategoryValue = (value) => {
  const v = String(value || "").trim().toUpperCase();
  return !v || v === NO_CATEGORY_ID || v === NO_CATEGORY_NAME || v === "NONE";
};

const nextQuestionBankId = async () => {
  const rows = await QuestionBank.find().select("questionBankId").lean();
  const maxNum = rows.reduce((acc, item) => {
    const n = parseInt(String(item?.questionBankId || "").replace("QSBANK", ""), 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, 0);
  return `QSBANK${maxNum + 1}`;
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
  const subjectByCode = await Syllabus.findOne(baseQuery).select("syllabusId subjectName examCode catId topics");
  if (subjectByCode) return subjectByCode;
  return Syllabus.findById(subjectInput).select("syllabusId subjectName examCode catId topics");
};

const buildHierarchyPayload = async ({ examMasterId, examCategoryId, subjectId, examStage }) => {
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
  const normalizedExamStage = String(examStage || "").trim().toUpperCase();
  if (normalizedExamStage && availableStages.length && !availableStages.includes(normalizedExamStage)) {
    throw new Error("CATEGORY_STAGE_MISMATCH");
  }

  return {
    examMasterId: String(selectedExam.examCode || "").toUpperCase(),
    examCategoryId: selectedCategory ? String(selectedCategory.catId || "").toUpperCase() : NO_CATEGORY_ID,
    subjectId: String(selectedSubject.syllabusId || "").toUpperCase(),
    examName: selectedExam.examName,
    examCode: selectedExam.examCode,
    examStage: normalizedExamStage || availableStages[0] || undefined,
    categoryName: selectedCategory?.catName || NO_CATEGORY_NAME,
    categoryCode: selectedCategory?.catId || NO_CATEGORY_ID,
    subjectName: selectedSubject.subjectName,
    subjectTopics: selectedSubject.topics || [],
  };
};

const createWithRetry = async (baseDoc, retries = 3) => {
  let attempts = 0;
  while (attempts <= retries) {
    try {
      return await QuestionBank.create(baseDoc);
    } catch (error) {
      if (error?.code === 11000 && attempts < retries) {
        const newId = await nextQuestionBankId();
        baseDoc.questionBankId = String(newId).toUpperCase();
        attempts += 1;
        continue;
      }
      throw error;
    }
  }
  throw new Error("CREATE_FAILED");
};

const normalizeImages = (value, limit = 5) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .slice(0, limit);
};

const normalizeOptionImages = (value) => ({
  A: normalizeImages(value?.A),
  B: normalizeImages(value?.B),
  C: normalizeImages(value?.C),
  D: normalizeImages(value?.D),
});

exports.getNextQuestionBankId = async (req, res) => {
  try {
    const nextId = await nextQuestionBankId();
    res.json({ success: true, nextId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getQuestionBank = async (req, res) => {
  try {
    const { examMasterId, examCategoryId, subjectId, examStage, topicName, subTopicName, status, marks, negativeMarks, page = 1, limit = 10, search = "" } = req.query;
    const filter = {};
    const toUpperList = (v) =>
      String(v || "")
        .split(",")
        .map((item) => String(item || "").trim().toUpperCase())
        .filter(Boolean);
    const examIds = toUpperList(examMasterId);
    const categoryIds = toUpperList(examCategoryId);
    const subjectIds = toUpperList(subjectId);
    const stages = toUpperList(examStage);
    const topicNames = toUpperList(topicName);
    const subTopicNames = toUpperList(subTopicName);
    if (examIds.length) filter.examMasterId = { $in: examIds };
    if (categoryIds.length) filter.examCategoryId = { $in: categoryIds };
    if (subjectIds.length) filter.subjectId = { $in: subjectIds };
    if (stages.length) filter.examStage = { $in: stages };
    if (topicNames.length) filter.topicName = { $in: topicNames };
    if (subTopicNames.length) filter.subTopicName = { $in: subTopicNames };
    if (String(status || "").toUpperCase() === "ACTIVE") filter.status = "ACTIVE";
    if (String(status || "").toUpperCase() === "INACTIVE") filter.status = "INACTIVE";
    if (String(marks || "").trim() !== "") filter.marks = Number(marks);
    if (String(negativeMarks || "").trim() !== "") filter.negativeMarks = Number(negativeMarks);

    if (String(search || "").trim()) {
      filter.$or = [
        { questionBankId: { $regex: search, $options: "i" } },
        { questionText: { $regex: search, $options: "i" } },
        { subjectName: { $regex: search, $options: "i" } },
      ];
    }

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (safePage - 1) * safeLimit;

    const [rows, total] = await Promise.all([
      QuestionBank.find(filter).sort({ createdAt: 1 }).skip(skip).limit(safeLimit),
      QuestionBank.countDocuments(filter),
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
    res.status(500).json({ success: false, message: error.message || "DATABASE ERROR" });
  }
};

exports.upsertQuestionBank = async (req, res) => {
  try {
    const {
      id,
      questionBankId,
      examMasterId,
      examCategoryId,
      subjectId,
      examStage,
      topicName,
      subTopicName,
      marks = 1,
      negativeMarks = 0,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanationText = "",
      questionImages,
      optionImages,
      explanationImages,
      status = "ACTIVE",
    } = req.body;

    if (!examMasterId) return res.status(400).json({ success: false, message: "VALID EXAM REQUIRED" });
    if (!subjectId) return res.status(400).json({ success: false, message: "VALID SUBJECT REQUIRED" });
    if (!String(questionText || "").trim()) {
      return res.status(400).json({ success: false, message: "QUESTION TEXT REQUIRED" });
    }

    const normalizedCorrect = String(correctOption || "").toUpperCase();
    if (!["A", "B", "C", "D"].includes(normalizedCorrect)) {
      return res.status(400).json({ success: false, message: "VALID CORRECT OPTION REQUIRED" });
    }
    if (
      !String(optionA || "").trim() ||
      !String(optionB || "").trim() ||
      !String(optionC || "").trim() ||
      !String(optionD || "").trim()
    ) {
      return res.status(400).json({ success: false, message: "ALL OPTIONS REQUIRED" });
    }

    const hierarchy = await buildHierarchyPayload({ examMasterId, examCategoryId, subjectId, examStage });
    const normalizedTopicName = String(topicName || "").trim().toUpperCase();
    const normalizedSubTopicName = String(subTopicName || "").trim().toUpperCase();
    if (normalizedSubTopicName && !normalizedTopicName) {
      return res.status(400).json({ success: false, message: "TOPIC REQUIRED WHEN SUBTOPIC SELECTED" });
    }
    if (normalizedTopicName || normalizedSubTopicName) {
      const topicRows = Array.isArray(hierarchy.subjectTopics) ? hierarchy.subjectTopics : [];
      const foundTopic = topicRows.find(
        (t) => String(t?.topicName || "").trim().toUpperCase() === normalizedTopicName
      );
      if (normalizedTopicName && !foundTopic) {
        return res.status(400).json({ success: false, message: "INVALID TOPIC FOR SUBJECT" });
      }
      if (normalizedSubTopicName) {
        const validSubTopics = (Array.isArray(foundTopic?.subTopics) ? foundTopic.subTopics : [])
          .map((s) => String(s || "").trim().toUpperCase());
        if (!validSubTopics.includes(normalizedSubTopicName)) {
          return res.status(400).json({ success: false, message: "INVALID SUBTOPIC FOR TOPIC" });
        }
      }
    }

    const payload = {
      ...hierarchy,
      marks: Number(marks) >= 0 ? Number(marks) : 1,
      negativeMarks: Number(negativeMarks) >= 0 ? Number(negativeMarks) : 0,
      questionText: String(questionText || "").trim(),
      optionA: String(optionA || "").trim(),
      optionB: String(optionB || "").trim(),
      optionC: String(optionC || "").trim(),
      optionD: String(optionD || "").trim(),
      correctOption: normalizedCorrect,
      explanationText: String(explanationText || "").trim(),
      questionImages: normalizeImages(questionImages),
      optionImages: normalizeOptionImages(optionImages),
      explanationImages: normalizeImages(explanationImages),
      topicName: normalizedTopicName || undefined,
      subTopicName: normalizedSubTopicName || undefined,
      status: String(status || "").toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    };
    delete payload.subjectTopics;

    if (id) {
      const updated = await QuestionBank.findByIdAndUpdate(id, { $set: payload }, { new: true });
      if (!updated) return res.status(404).json({ success: false, message: "QUESTION NOT FOUND" });
      return res.json({ success: true, data: updated });
    }

    const nextId = questionBankId || (await nextQuestionBankId());
    const created = await createWithRetry({
      questionBankId: String(nextId).toUpperCase(),
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
    if (error?.message === "CATEGORY_STAGE_MISMATCH") {
      return res.status(400).json({ success: false, message: "EXAM STAGE DOES NOT BELONG TO CATEGORY" });
    }
    if (error?.message === "SUBJECT_CATEGORY_MISMATCH") {
      return res.status(400).json({ success: false, message: "SUBJECT DOES NOT BELONG TO CATEGORY" });
    }
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "QUESTION BANK ID ALREADY EXISTS" });
    }
    return res.status(500).json({ success: false, message: error.message || "DATABASE ERROR" });
  }
};

exports.deleteQuestionBank = async (req, res) => {
  try {
    await QuestionBank.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "DELETED" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
