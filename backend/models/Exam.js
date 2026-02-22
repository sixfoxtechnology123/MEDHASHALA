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
    description: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", examSchema);