const mongoose = require("mongoose");

const topicSchema = new mongoose.Schema(
  {
    topicName: { type: String, required: true, trim: true, uppercase: true },
    subTopics: [{ type: String, trim: true, uppercase: true }],
  },
  { _id: false }
);

const syllabusSchema = new mongoose.Schema(
  {
    syllabusId: { type: String, unique: true, required: true },
    examName: { type: String, required: true, trim: true, uppercase: true },
    examCode: { type: String, required: true, trim: true, uppercase: true },
    examStage: { type: String, trim: true, uppercase: true },
    catId: { type: String, required: true, trim: true, uppercase: true },
    catName: { type: String, required: true, trim: true, uppercase: true },
    subjectName: { type: String, required: true, trim: true, uppercase: true },
    topics: { type: [topicSchema], default: [] },
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

module.exports = mongoose.model("Syllabus", syllabusSchema);
