const mongoose = require("mongoose");

const questionBankSchema = new mongoose.Schema(
  {
    questionBankId: { type: String, unique: true, required: true },
    examMasterId: { type: String, required: true, trim: true, uppercase: true },
    examCategoryId: { type: String, required: true, trim: true, uppercase: true },
    subjectId: { type: String, required: true, trim: true, uppercase: true },

    examName: { type: String, required: true, trim: true, uppercase: true },
    examCode: { type: String, required: true, trim: true, uppercase: true },
    examStage: { type: String, trim: true, uppercase: true },
    categoryName: { type: String, required: true, trim: true, uppercase: true },
    categoryCode: { type: String, required: true, trim: true, uppercase: true },
    subjectName: { type: String, required: true, trim: true, uppercase: true },

    marks: { type: Number, default: 1, min: 0 },
    negativeMarks: { type: Number, default: 0, min: 0 },
    questionText: { type: String, required: true, trim: true },
    optionA: { type: String, required: true, trim: true },
    optionB: { type: String, required: true, trim: true },
    optionC: { type: String, required: true, trim: true },
    optionD: { type: String, required: true, trim: true },
    correctOption: { type: String, enum: ["A", "B", "C", "D"], required: true },
    explanationText: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      uppercase: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuestionBank", questionBankSchema);
