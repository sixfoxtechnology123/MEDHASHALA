const Question = require("../models/Question");
const mongoose = require("mongoose");

exports.createQuestion = async (req, res) => {
  try {
    const question = await Question.create(req.body);
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: "Failed to create question", error: error.message });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const { examId, categoryId } = req.query;

    if (!examId || !categoryId) {
      return res.status(400).json({ message: "examId and categoryId are required" });
    }

    if (!mongoose.isValidObjectId(examId) || !mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({ message: "Invalid examId or categoryId" });
    }

    const questions = await Question.find({ examId, categoryId });
    return res.json(questions);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch questions", error: error.message });
  }
};
