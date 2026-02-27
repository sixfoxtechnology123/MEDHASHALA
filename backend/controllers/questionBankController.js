const QuestionBank = require("../models/QuestionBank");
const Exam = require("../models/Exam");
const Category = require("../models/Category");
const Syllabus = require("../models/Syllabus");

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
    const { examMasterId, examCategoryId, subjectId, status, page = 1, limit = 10, search = "" } = req.query;
    const filter = {};
    if (examMasterId) filter.examMasterId = String(examMasterId).toUpperCase();
    if (examCategoryId) filter.examCategoryId = String(examCategoryId).toUpperCase();
    if (subjectId) filter.subjectId = String(subjectId).toUpperCase();
    if (String(status || "").toUpperCase() === "ACTIVE") filter.status = "ACTIVE";
    if (String(status || "").toUpperCase() === "INACTIVE") filter.status = "INACTIVE";

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
      marks = 1,
      negativeMarks = 0,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanationText = "",
      status = "ACTIVE",
    } = req.body;

    if (!examMasterId) return res.status(400).json({ success: false, message: "VALID EXAM REQUIRED" });
    if (!examCategoryId) return res.status(400).json({ success: false, message: "VALID CATEGORY REQUIRED" });
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

    const hierarchy = await buildHierarchyPayload({ examMasterId, examCategoryId, subjectId });

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
      status: String(status || "").toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    };

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
