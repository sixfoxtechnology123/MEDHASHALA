const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    qNo: { type: String, trim: true, uppercase: true },
    marks: { type: Number, default: null },
    negativeMarks: { type: Number, default: null },
    questionText: { type: String, trim: true, default: "" },
    optionA: { type: String, trim: true, default: "" },
    optionB: { type: String, trim: true, default: "" },
    optionC: { type: String, trim: true, default: "" },
    optionD: { type: String, trim: true, default: "" },
    correctOption: { type: String, enum: ["A", "B", "C", "D", ""], default: "" },
    explanationText: { type: String, trim: true, default: "" },
    questionImages: { type: [String], default: [] },
    optionImages: {
      A: { type: [String], default: [] },
      B: { type: [String], default: [] },
      C: { type: [String], default: [] },
      D: { type: [String], default: [] },
    },
    explanationImages: { type: [String], default: [] },
  },
  { _id: false }
);

const questionBankSchema = new mongoose.Schema(
  {
    questionSetId: { type: String, unique: true, sparse: true, required: true },
    examMasterId: { type: String, trim: true, uppercase: true, default: "" },
    examCategoryId: { type: String, trim: true, uppercase: true, default: "" },
    subjectId: { type: String, trim: true, uppercase: true, default: "" },
    examName: { type: String, trim: true, uppercase: true, default: "" },
    examCode: { type: String, trim: true, uppercase: true, default: "" },
    examStage: { type: String, trim: true, uppercase: true, default: "" },
    categoryName: { type: String, trim: true, uppercase: true, default: "" },
    categoryCode: { type: String, trim: true, uppercase: true, default: "" },
    subjectName: { type: String, trim: true, uppercase: true, default: "" },
    topicName: { type: String, trim: true, uppercase: true, default: "" },
    subTopicName: { type: String, trim: true, uppercase: true, default: "" },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      uppercase: true,
      trim: true,
    },
    questions: { type: [questionSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuestionBank", questionBankSchema);
