const mongoose = require("mongoose");

const mockTestSchema = new mongoose.Schema(
  {
    questionId: { type: String, unique: true, required: true },
    examMasterId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    examCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Syllabus", required: true },

    examName: { type: String, required: true, trim: true, uppercase: true },
    examCode: { type: String, required: true, trim: true, uppercase: true },
    categoryName: { type: String, required: true, trim: true, uppercase: true },
    categoryCode: { type: String, required: true, trim: true, uppercase: true },
    subjectName: { type: String, required: true, trim: true, uppercase: true },

    questionText: { type: String, required: true, trim: true },
    marks: { type: Number, default: 1, min: 0 },
    negativeMarks: { type: Number, default: 0, min: 0 },
    optionA: { type: String, required: true, trim: true },
    optionB: { type: String, required: true, trim: true },
    optionC: { type: String, required: true, trim: true },
    optionD: { type: String, required: true, trim: true },
    correctOption: { type: String, enum: ["A", "B", "C", "D"], required: true },
    explanationText: { type: String, trim: true, default: "" },
    difficultyLevel: {
      type: String,
      enum: ["easy", "moderate", "hard"],
      default: "moderate",
      lowercase: true,
      trim: true,
    },
    languageCode: { type: String, trim: true, default: "en" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MockTest", mockTestSchema);
