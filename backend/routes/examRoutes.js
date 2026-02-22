const express = require("express");
const router = express.Router();
const examController = require("../controllers/examController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/", protect, examController.getExams);
router.get("/latest", protect, examController.getLatestExam);
router.post("/", protect, adminOnly, examController.createExam);
router.put("/:id", protect, adminOnly, examController.updateExam);
router.delete("/:id", protect, adminOnly, examController.deleteExam);

module.exports = router;
