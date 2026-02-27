const mongoose = require("mongoose");
const Syllabus = require("../models/Syllabus");
const Exam = require("../models/Exam");
const Category = require("../models/Category");
const MockTest = require("../models/MockTest");
const QuestionBank = require("../models/QuestionBank");

const generateNextSyllabusId = async () => {
  const lastSyllabus = await Syllabus.findOne().sort({ syllabusId: -1 });
  if (!lastSyllabus || !lastSyllabus.syllabusId) return "SYLLABUS-00001";

  const lastNum = parseInt(lastSyllabus.syllabusId.replace("SYLLABUS-", ""), 10);
  return `SYLLABUS-${String((Number.isNaN(lastNum) ? 0 : lastNum) + 1).padStart(5, "0")}`;
};

exports.getNextSyllabusId = async (req, res) => {
  try {
    const nextId = await generateNextSyllabusId();
    res.json({ success: true, nextId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllSyllabus = async (req, res) => {
  try {
    await Syllabus.updateMany(
      {
        $or: [
          { examId: { $exists: true } },
          { examObjectId: { $exists: true } },
          { categoryId: { $exists: true } },
          { categoryObjectId: { $exists: true } },
        ],
      },
      {
        $unset: {
          examId: 1,
          examObjectId: 1,
          categoryId: 1,
          categoryObjectId: 1,
        },
      }
    );

    const rows = await Syllabus.find().sort({ createdAt: 1 });
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.upsertSyllabus = async (req, res) => {
  try {
    const {
      id,
      syllabusId,
      examId,
      categoryId,
      subjectName,
      topics = [],
      status = "ACTIVE",
    } = req.body;

    if (!examId || !mongoose.isValidObjectId(examId)) {
      return res.status(400).json({ success: false, message: "VALID EXAM REQUIRED" });
    }
    if (!categoryId || !mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({ success: false, message: "VALID CATEGORY REQUIRED" });
    }
    if (!subjectName || !subjectName.trim()) {
      return res.status(400).json({ success: false, message: "SUBJECT NAME REQUIRED" });
    }

    const cleanTopics = (Array.isArray(topics) ? topics : [])
      .map((t) => ({
        topicName: String(t?.topicName || "").trim().toUpperCase(),
        subTopics: (Array.isArray(t?.subTopics) ? t.subTopics : [])
          .map((s) => String(s || "").trim().toUpperCase())
          .filter(Boolean),
      }))
      .filter((t) => t.topicName);

    if (cleanTopics.length === 0) {
      return res.status(400).json({ success: false, message: "AT LEAST ONE TOPIC REQUIRED" });
    }

    const selectedExam = await Exam.findById(examId).select("examName examCode");
    if (!selectedExam) {
      return res.status(404).json({ success: false, message: "EXAM NOT FOUND" });
    }

    const selectedCategory = await Category.findById(categoryId).select("catId catName examName examCode");
    if (!selectedCategory) {
      return res.status(404).json({ success: false, message: "CATEGORY NOT FOUND" });
    }
    if (
      String(selectedCategory.examCode || "").toUpperCase() !==
      String(selectedExam.examCode || "").toUpperCase()
    ) {
      return res.status(400).json({ success: false, message: "CATEGORY DOES NOT BELONG TO EXAM" });
    }

    const payload = {
      examName: selectedExam.examName,
      examCode: selectedExam.examCode,
      catId: selectedCategory.catId,
      catName: selectedCategory.catName,
      subjectName: String(subjectName).trim().toUpperCase(),
      topics: cleanTopics,
      status: String(status).toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    };

    if (id) {
      const updated = await Syllabus.findByIdAndUpdate(
        id,
        {
          $set: payload,
          $unset: {
            examId: 1,
            examObjectId: 1,
            categoryId: 1,
            categoryObjectId: 1,
          },
        },
        { new: true }
      );
      if (!updated) return res.status(404).json({ success: false, message: "SYLLABUS NOT FOUND" });
      return res.json({ success: true, data: updated });
    }

    const nextId = syllabusId || (await generateNextSyllabusId());
    const created = await Syllabus.create({
      syllabusId: String(nextId).toUpperCase(),
      ...payload,
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "SYLLABUS ID ALREADY EXISTS" });
    }
    res.status(500).json({ success: false, message: error.message || "DATABASE ERROR" });
  }
};

exports.deleteSyllabus = async (req, res) => {
  try {
    await Syllabus.findByIdAndDelete(req.params.id);
    await MockTest.deleteMany({ subjectId: req.params.id });
    await QuestionBank.deleteMany({ subjectId: req.params.id });
    res.json({ success: true, message: "DELETED" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSyllabusById = async (req, res) => {
  try {
    const row = await Syllabus.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: "SYLLABUS NOT FOUND" });
    res.json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
