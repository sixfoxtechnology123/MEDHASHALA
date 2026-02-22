const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam" },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  question: String,
  options: [String],
  correctAnswer: String,
  marks: Number,
  timeLimit: Number
}, { timestamps: true });

module.exports = mongoose.model("Question", questionSchema);