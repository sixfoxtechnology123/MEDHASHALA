const express = require("express");
const router = express.Router();
const { getSidebarStructure } = require("../controllers/sidebarController");
const { protect } = require("../middleware/authMiddleware");

// Endpoint: GET /api/public/sidebar-menu
router.get("/sidebar-menu", protect, getSidebarStructure);

module.exports = router;
