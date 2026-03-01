const Category = require("../models/Category");
const Exam = require("../models/Exam");
const Syllabus = require("../models/Syllabus");
const MockTest = require("../models/MockTest");
const QuestionBank = require("../models/QuestionBank");
const mongoose = require("mongoose");

const generateNextCategoryId = async () => {
  const lastCat = await Category.findOne().sort({ catId: -1 });
  if (!lastCat || !lastCat.catId) return "CAT-0001";

  const lastNum = parseInt(lastCat.catId.replace("CAT-", ""), 10);
  return `CAT-${String(lastNum + 1).padStart(4, "0")}`;
};

// 1. GENERATE NEXT ID (CAT-0001)
exports.getNextCategoryId = async (req, res) => {
  try {
    const nextId = await generateNextCategoryId();
    res.json({ success: true, nextId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.upsertCategory = async (req, res) => {
  try {
    const { id, catId, examId, catName, examStage, features = [], status = "ACTIVE" } = req.body;

    if (!examId || !mongoose.isValidObjectId(examId)) {
      return res.status(400).json({ success: false, message: "VALID EXAM REQUIRED" });
    }

    if (!catName || !catName.trim()) {
      return res.status(400).json({ success: false, message: "CATEGORY NAME REQUIRED" });
    }

    const selectedExam = await Exam.findById(examId).select("examName examCode");
    if (!selectedExam) {
      return res.status(404).json({ success: false, message: "EXAM NOT FOUND" });
    }

    const categoryData = {
      catName,
      features,
      status: String(status).toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      examName: selectedExam.examName,
      examCode: selectedExam.examCode,
      examStage: String(examStage || "").trim().toUpperCase() || undefined,
    };

    if (id) {
      const updated = await Category.findByIdAndUpdate(
        id,
        { $set: categoryData, $unset: { examId: 1 } },
        { new: true }
      );
      return res.json({ success: true, data: updated });
    } else {
      const nextCatId = catId || (await generateNextCategoryId());
      const newCategory = new Category({
        catId: nextCatId,
        ...categoryData,
      });
      await newCategory.save();
      return res.status(201).json({ success: true, data: newCategory });
    }
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "CATEGORY ID ALREADY EXISTS" });
    }
    res.status(500).json({ success: false, message: error.message || "DATABASE ERROR" });
  }
};

// 3. GET ALL (With Populated Exam Names)
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .sort({ createdAt: 1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. DELETE
exports.deleteCategory = async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (deleted) {
      await Syllabus.deleteMany({
        examCode: deleted.examCode,
        catId: deleted.catId,
      });
      await MockTest.deleteMany({
        examCode: deleted.examCode,
        categoryCode: deleted.catId,
      });
      await QuestionBank.deleteMany({
        examCode: deleted.examCode,
        categoryCode: deleted.catId,
      });
    }
    res.json({ success: true, message: "DELETED" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
