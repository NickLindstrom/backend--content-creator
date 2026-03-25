const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");
const { createSite } = require("../controllers/adminController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post("/admin/create-site", authMiddleware, adminMiddleware, asyncHandler(createSite));

module.exports = router;
