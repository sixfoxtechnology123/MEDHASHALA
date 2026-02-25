const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    examCode: {
      type: String,
      unique: true,
    },
    examName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", examSchema);
