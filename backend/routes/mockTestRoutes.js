const express = require("express");
const router = express.Router();
const mockCtrl = require("../controllers/mockTestController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/next-id", protect, mockCtrl.getNextQuestionSetId);
router.get("/all", protect, mockCtrl.getAllMockTests);
router.get("/set/:id", protect, mockCtrl.getMockTestSetById);
router.get("/suggest-questions", protect, mockCtrl.suggestQuestionsForSet);
router.get("/attempt-questions", protect, mockCtrl.getAttemptQuestions);
router.post("/select-for-student/:id", protect, adminOnly, mockCtrl.selectSetForStudent);
router.post("/upsert", protect, adminOnly, mockCtrl.upsertMockTest);
router.delete("/:id", protect, adminOnly, mockCtrl.deleteMockTest);

module.exports = router;
