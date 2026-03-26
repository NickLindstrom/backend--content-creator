const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");
const { createSite, activatePages, deactivatePages } = require("../controllers/adminController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post("/admin/create-site", authMiddleware, adminMiddleware, asyncHandler(createSite));
router.post("/admin/sites/:siteId/activate-pages", authMiddleware, adminMiddleware, asyncHandler(activatePages));
router.delete("/admin/sites/:siteId/pages", authMiddleware, adminMiddleware, asyncHandler(deactivatePages));

module.exports = router;
