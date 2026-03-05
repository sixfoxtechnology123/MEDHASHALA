const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  catId: { type: String, unique: true, required: true },
  examName: { type: String, required: true, uppercase: true, trim: true },
  examCode: { type: String, required: true, uppercase: true, trim: true },
  examStage: { type: String, trim: true, uppercase: true },
  examStages: { type: [String], default: [] },

  catName: { type: String, required: true, uppercase: true },
  features: { type: [String], default: [] },
  status: {
    type: String,
    enum: ["ACTIVE", "INACTIVE"],
    default: "ACTIVE",
    uppercase: true,
    trim: true,
  },
}, { timestamps: true });

categorySchema.pre("save", function syncStageFields() {
  const list = Array.isArray(this.examStages)
    ? this.examStages.map((v) => String(v || "").trim().toUpperCase()).filter(Boolean)
    : [];
  if (list.length) {
    this.examStages = Array.from(new Set(list));
    this.examStage = this.examStages[0];
  } else if (String(this.examStage || "").trim()) {
    this.examStage = String(this.examStage).trim().toUpperCase();
    this.examStages = [this.examStage];
  } else {
    this.examStages = [];
    this.examStage = undefined;
  }
});

module.exports = mongoose.model("Category", categorySchema);
