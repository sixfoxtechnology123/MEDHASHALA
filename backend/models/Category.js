const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  catId: { type: String, unique: true, required: true },
  examName: { type: String, required: true, uppercase: true, trim: true },
  examCode: { type: String, required: true, uppercase: true, trim: true },

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

module.exports = mongoose.model("Category", categorySchema);
