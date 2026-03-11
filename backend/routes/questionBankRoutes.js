const express = require("express");
const router = express.Router();
const questionBankCtrl = require("../controllers/questionBankController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/next-id", protect, questionBankCtrl.getNextQuestionBankId);
router.get("/all", protect, questionBankCtrl.getQuestionBank);
router.get("/:id", protect, questionBankCtrl.getQuestionBankById);
router.post("/upsert", protect, adminOnly, questionBankCtrl.upsertQuestionBank);
router.delete("/:id", protect, adminOnly, questionBankCtrl.deleteQuestionBank);

module.exports = router;
