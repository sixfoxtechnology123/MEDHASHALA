const express = require("express");
const router = express.Router();
const mockCtrl = require("../controllers/mockTestController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/next-id", protect, mockCtrl.getNextQuestionId);
router.get("/all", protect, mockCtrl.getAllMockTests);
router.post("/upsert", protect, adminOnly, mockCtrl.upsertMockTest);
router.delete("/:id", protect, adminOnly, mockCtrl.deleteMockTest);

module.exports = router;
