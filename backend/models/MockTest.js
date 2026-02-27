const mongoose = require("mongoose");

const mockTestSchema = new mongoose.Schema(
  {
    questionSetId: { type: String, unique: true, required: true },
    // Legacy compatibility for older DB unique index on `questionId`
    questionId: { type: String, trim: true, uppercase: true },
    examMasterId: { type: String, required: true, trim: true, uppercase: true },
    examCategoryId: { type: String, required: true, trim: true, uppercase: true },
    subjectId: { type: String, required: true, trim: true, uppercase: true },

    examName: { type: String, required: true, trim: true, uppercase: true },
    examCode: { type: String, required: true, trim: true, uppercase: true },
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
