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
  const rows = await QuestionBank.find().select("questionSetId").lean();
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
    examStage: normalizedExamStage || availableStages[0] || "",
    categoryName: selectedCategory?.catName || NO_CATEGORY_NAME,
    categoryCode: selectedCategory?.catId || NO_CATEGORY_ID,
    subjectName: selectedSubject.subjectName,
  };
};

const buildOptionalHierarchyPayload = async ({ examMasterId, examCategoryId, subjectId, examStage }) => {
  const hasAny = [examMasterId, examCategoryId, subjectId, examStage].some((v) => String(v || "").trim());
  if (!hasAny) {
    return {
      examMasterId: "",
      examCategoryId: "",
      subjectId: "",
      examName: "",
      examCode: "",
      examStage: "",
      categoryName: "",
      categoryCode: "",
      subjectName: "",
    };
  }

  try {
    return await buildHierarchyPayload({ examMasterId, examCategoryId, subjectId, examStage });
  } catch {
    return {
      examMasterId: String(examMasterId || "").trim().toUpperCase(),
      examCategoryId: String(examCategoryId || "").trim().toUpperCase(),
      subjectId: String(subjectId || "").trim().toUpperCase(),
      examName: "",
      examCode: String(examMasterId || "").trim().toUpperCase(),
      examStage: String(examStage || "").trim().toUpperCase(),
      categoryName: "",
      categoryCode: String(examCategoryId || "").trim().toUpperCase(),
      subjectName: "",
    };
  }
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

const toNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

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
    const { examMasterId, examCategoryId, subjectId, examStage, topicName, subTopicName, status, page = 1, limit = 10, search = "" } = req.query;
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

    if (String(search || "").trim()) {
      filter.$or = [
        { questionSetId: { $regex: search, $options: "i" } },
        { examName: { $regex: search, $options: "i" } },
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

exports.getQuestionBankById = async (req, res) => {
  try {
    const row = await QuestionBank.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ success: false, message: "QUESTION SET NOT FOUND" });
    res.json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "DATABASE ERROR" });
  }
};

exports.upsertQuestionBank = async (req, res) => {
  try {
    const {
      id,
      questionSetId,
      examMasterId,
      examCategoryId,
      subjectId,
      examStage,
      topicName,
      subTopicName,
      status = "ACTIVE",
      questions,
    } = req.body;

    const hierarchy = await buildOptionalHierarchyPayload({ examMasterId, examCategoryId, subjectId, examStage });
    const normalizedTopicName = String(topicName || "").trim().toUpperCase();
    const normalizedSubTopicName = String(subTopicName || "").trim().toUpperCase();

    const normalizedQuestions = (Array.isArray(questions) ? questions : []).map((q, idx) => ({
      qNo: `Q${idx + 1}`,
      marks: q?.marks ? toNumberOrNull(q.marks) : 0,
      negativeMarks: q?.negativeMarks ? toNumberOrNull(q.negativeMarks) : 0,
      questionText: String(q?.questionText || ""),
      optionA: String(q?.optionA || ""),
      optionB: String(q?.optionB || ""),
      optionC: String(q?.optionC || ""),
      optionD: String(q?.optionD || ""),
      correctOption: ["A", "B", "C", "D"].includes(String(q?.correctOption || "").toUpperCase())
        ? String(q?.correctOption || "").toUpperCase()
        : "",
      explanationText: String(q?.explanationText || ""),
      questionImages: normalizeImages(q?.questionImages),
      optionImages: normalizeOptionImages(q?.optionImages),
      explanationImages: normalizeImages(q?.explanationImages),
    }));

    const payload = {
      ...hierarchy,
      topicName: normalizedTopicName || "",
      subTopicName: normalizedSubTopicName || "",
      status: String(status || "").toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      questions: normalizedQuestions,
    };

    if (id) {
      const updated = await QuestionBank.findByIdAndUpdate(id, { $set: payload }, { returnDocument: 'after' });
      if (!updated) return res.status(404).json({ success: false, message: "QUESTION SET NOT FOUND" });
      return res.json({ success: true, data: updated });
    }

    const nextId = questionSetId || (await nextQuestionBankId());
    const created = await QuestionBank.create({
      questionSetId: String(nextId).toUpperCase(),
      ...payload,
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "QUESTION SET ID ALREADY EXISTS" });
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
