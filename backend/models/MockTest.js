const mongoose = require("mongoose");

const mockTestSchema = new mongoose.Schema(
  {
    questionSetId: { type: String, unique: true, required: true },
    // Legacy compatibility for older DB unique index on `questionId`
    questionId: { type: String, trim: true, uppercase: true },
    examMasterId: { type: String, required: true, trim: true, uppercase: true },
    examCategoryId: { type: String, required: true, trim: true, uppercase: true },
    subjectId: { type: String, required: true, trim: true, uppercase: true },
    examMasterIds: { type: [String], default: [] },
    examCategoryIds: { type: [String], default: [] },
    examStages: { type: [String], default: [] },
    subjectIds: { type: [String], default: [] },
    topicName: { type: String, trim: true, uppercase: true },
    subTopicName: { type: String, trim: true, uppercase: true },
    topicNames: { type: [String], default: [] },
    subTopicNames: { type: [String], default: [] },
    questionBreakdown: {
      type: [
        {
          examName: { type: String, trim: true, uppercase: true },
          categoryName: { type: String, trim: true, uppercase: true },
          subjectName: { type: String, trim: true, uppercase: true },
          topicName: { type: String, trim: true, uppercase: true },
          subTopicName: { type: String, trim: true, uppercase: true },
          count: { type: Number, default: 0 },
        },
      ],
      default: [],
    },

    examName: { type: String, required: true, trim: true, uppercase: true },
    examCode: { type: String, required: true, trim: true, uppercase: true },
    examStage: { type: String, trim: true, uppercase: true },
    categoryName: { type: String, required: true, trim: true, uppercase: true },
    categoryCode: { type: String, required: true, trim: true, uppercase: true },
    subjectName: { type: String, required: true, trim: true, uppercase: true },

    testDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      uppercase: true,
      trim: true,
    },
    isActive: { type: Boolean, default: true },
    isSelectedForAttempt: { type: Boolean, default: false },
    questionIds: [{ type: String, required: true, trim: true, uppercase: true }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("MockTest", mockTestSchema);
