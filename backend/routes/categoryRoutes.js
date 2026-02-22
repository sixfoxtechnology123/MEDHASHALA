const express = require("express");
const router = express.Router();
const catCtrl = require("../controllers/categoryController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Prefix: /api/master/category
router.get("/next-id", protect, catCtrl.getNextCategoryId);
router.get("/all", protect, catCtrl.getAllCategories);
router.post("/upsert", protect, adminOnly, catCtrl.upsertCategory);
router.delete("/:id", protect, adminOnly, catCtrl.deleteCategory);

module.exports = router;