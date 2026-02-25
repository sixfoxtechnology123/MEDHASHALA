const Exam = require("../models/Exam");
const Category = require("../models/Category");
const Syllabus = require("../models/Syllabus");
const MockTest = require("../models/MockTest");

/**
 * HELPER: Generate Next ID (Non-reusable)
 * Looks for the highest number used and adds 1
 */
const generateNextId = async () => {
  // Find the exam with the highest examCode
  const lastExam = await Exam.findOne().sort({ examCode: -1 });
  
  let nextNumber = 1;
  if (lastExam && lastExam.examCode) {
    // Extract digits from "EXAM0005" -> 5
    const lastNumber = parseInt(lastExam.examCode.replace("EXAM", ""), 10);
    nextNumber = lastNumber + 1;
  }
  
  return "EXAM" + String(nextNumber).padStart(4, "0");
};

// CREATE NEW EXAM
exports.createExam = async (req, res) => {
  try {
    const examCode = await generateNextId();

    const exam = new Exam({
      examCode,
      examName: req.body.examName,
      status: (req.body.status || "ACTIVE").toUpperCase(),
      description: req.body.description,
    });

    await exam.save();
    res.status(201).json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL EXAMS
exports.getExams = async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: 1 });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET NEXT ID (For Frontend Modal)
exports.getLatestExam = async (req, res) => {
  try {
    const nextId = await generateNextId();
    res.json({ nextId });
  } catch (error) {
    res.status(500).json({ message: "ERROR_GENERATING_ID" });
  }
};

// UPDATE EXAM
exports.updateExam = async (req, res) => {
  try {
    const updated = await Exam.findByIdAndUpdate(
      req.params.id,
      {
        examName: req.body.examName,
        status: (req.body.status || "ACTIVE").toUpperCase(),
        description: req.body.description,
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Exam not found" });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE EXAM (WITH CASCADE DELETE)
exports.deleteExam = async (req, res) => {
  try {
    // 1. Find the exam to get the examName
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // 2. Delete all Categories that belong to this Exam Name
    // This ensures your Category Master stays clean
    await Category.deleteMany({ examName: exam.examName });
    await Syllabus.deleteMany({ examCode: exam.examCode });
    await MockTest.deleteMany({ examCode: exam.examCode });

    // 3. Delete the Exam itself
    await Exam.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: "Exam and related categories deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
