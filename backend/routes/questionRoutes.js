const router = require("express").Router();
const {
  createQuestion,
  getQuestions
} = require("../controllers/questionController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

router.post("/", protect, adminOnly, createQuestion);
router.get("/", protect, getQuestions);

module.exports = router;