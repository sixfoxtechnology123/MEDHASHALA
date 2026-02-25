const mongoose = require("mongoose");
const MockTest = require("../models/MockTest");
const Exam = require("../models/Exam");
const Category = require("../models/Category");
const Syllabus = require("../models/Syllabus");

const generateNextQuestionId = async () => {
  const rows = await MockTest.find().select("questionId").lean();
  const maxNum = rows.reduce((acc, item) => {
    const n = parseInt(String(item?.questionId || "").replace("QS-SET", ""), 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, 0);
  return `QS-SET${maxNum + 1}`;
};

exports.getNextQuestionId = async (req, res) => {
  try {
    const nextId = await generateNextQuestionId();
    res.json({ success: true, nextId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllMockTests = async (req, res) => {
  try {
    const { subjectId, onlyActive } = req.query;
    const filter = {};
    if (subjectId && mongoose.isValidObjectId(subjectId)) {
      filter.subjectId = new mongoose.Types.ObjectId(String(subjectId));
    }
    if (String(onlyActive).toLowerCase() === "true") {
      filter.isActive = true;
    }
    const rows = await MockTest.find(filter).sort({ createdAt: 1 });
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.upsertMockTest = async (req, res) => {
  try {
    const {
      id,
      questionId,
      examMasterId,
      examCategoryId,
      subjectId,
      questionText,
      marks = 1,
      negativeMarks = 0,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanationText = "",
      difficultyLevel = "moderate",
      languageCode = "en",
      isActive = true,
    } = req.body;

    if (!examMasterId || !mongoose.isValidObjectId(examMasterId)) {
      return res.status(400).json({ success: false, message: "VALID EXAM REQUIRED" });
    }
    if (!examCategoryId || !mongoose.isValidObjectId(examCategoryId)) {
      return res.status(400).json({ success: false, message: "VALID CATEGORY REQUIRED" });
    }
    if (!subjectId || !mongoose.isValidObjectId(subjectId)) {
      return res.status(400).json({ success: false, message: "VALID SUBJECT REQUIRED" });
    }
    if (!questionText || !String(questionText).trim()) {
      return res.status(400).json({ success: false, message: "QUESTION TEXT REQUIRED" });
    }

    const selectedExam = await Exam.findById(examMasterId).select("examName examCode");
    if (!selectedExam) return res.status(404).json({ success: false, message: "EXAM NOT FOUND" });

    const selectedCategory = await Category.findById(examCategoryId).select("catName catId examCode");
    if (!selectedCategory) {
      return res.status(404).json({ success: false, message: "CATEGORY NOT FOUND" });
    }

    const selectedSubject = await Syllabus.findById(subjectId).select("subjectName examCode catId");
    if (!selectedSubject) return res.status(404).json({ success: false, message: "SUBJECT NOT FOUND" });

    if (
      String(selectedCategory.examCode || "").toUpperCase() !==
      String(selectedExam.examCode || "").toUpperCase()
    ) {
      return res.status(400).json({ success: false, message: "CATEGORY DOES NOT BELONG TO EXAM" });
    }

    if (
      String(selectedSubject.examCode || "").toUpperCase() !==
        String(selectedExam.examCode || "").toUpperCase() ||
      String(selectedSubject.catId || "").toUpperCase() !==
        String(selectedCategory.catId || "").toUpperCase()
    ) {
      return res.status(400).json({ success: false, message: "SUBJECT DOES NOT BELONG TO CATEGORY" });
    }

    const payload = {
      examMasterId: selectedExam._id,
      examCategoryId: selectedCategory._id,
      subjectId: selectedSubject._id,
      examName: selectedExam.examName,
      examCode: selectedExam.examCode,
      categoryName: selectedCategory.catName,
      categoryCode: selectedCategory.catId,
      subjectName: selectedSubject.subjectName,
      questionText: String(questionText).trim(),
      marks: Number(marks) >= 0 ? Number(marks) : 1,
      negativeMarks: Number(negativeMarks) >= 0 ? Number(negativeMarks) : 0,
      optionA: String(optionA || "").trim(),
      optionB: String(optionB || "").trim(),
      optionC: String(optionC || "").trim(),
      optionD: String(optionD || "").trim(),
      correctOption: String(correctOption || "").toUpperCase(),
      explanationText: String(explanationText || "").trim(),
      difficultyLevel: String(difficultyLevel || "moderate").toLowerCase(),
      languageCode: String(languageCode || "en").trim().toLowerCase(),
      isActive: Boolean(isActive),
    };

    if (!payload.optionA || !payload.optionB || !payload.optionC || !payload.optionD) {
      return res.status(400).json({ success: false, message: "ALL OPTIONS REQUIRED" });
    }

    if (id) {
      const updated = await MockTest.findByIdAndUpdate(id, { $set: payload }, { new: true });
      if (!updated) return res.status(404).json({ success: false, message: "QUESTION NOT FOUND" });
      return res.json({ success: true, data: updated });
    }

    const nextId = questionId || (await generateNextQuestionId());
    const created = await MockTest.create({
      questionId: String(nextId).toUpperCase(),
      ...payload,
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "QUESTION ID ALREADY EXISTS" });
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
