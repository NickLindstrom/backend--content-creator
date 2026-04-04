const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");
const {
  createSite,
  activatePages,
  deactivatePages,
  listPatches,
  previewPatch,
  applyPatch,
  listPatchRuns
} = require("../controllers/adminController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post("/admin/create-site", authMiddleware, adminMiddleware, asyncHandler(createSite));
router.post("/admin/sites/:siteId/activate-pages", authMiddleware, adminMiddleware, asyncHandler(activatePages));
router.delete("/admin/sites/:siteId/pages", authMiddleware, adminMiddleware, asyncHandler(deactivatePages));
router.get("/admin/patches", authMiddleware, adminMiddleware, asyncHandler(listPatches));
router.get("/admin/patches/runs", authMiddleware, adminMiddleware, asyncHandler(listPatchRuns));
router.post("/admin/patches/:patchId/preview", authMiddleware, adminMiddleware, asyncHandler(previewPatch));
router.post("/admin/patches/:patchId/apply", authMiddleware, adminMiddleware, asyncHandler(applyPatch));

module.exports = router;