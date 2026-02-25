const express = require("express");
const router = express.Router();
const syllabusCtrl = require("../controllers/syllabusController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/next-id", protect, syllabusCtrl.getNextSyllabusId);
router.get("/all", protect, syllabusCtrl.getAllSyllabus);
router.get("/:id", protect, syllabusCtrl.getSyllabusById);
router.post("/upsert", protect, adminOnly, syllabusCtrl.upsertSyllabus);
router.delete("/:id", protect, adminOnly, syllabusCtrl.deleteSyllabus);

module.exports = router;
