const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");
const {
  createSite,
  researchCreateSite,
  activatePages,
  deactivatePages,
  listPatches,
  previewPatch,
  applyPatch,
  listPatchRuns,
  deletePatchRun,
  listSiteAdmins,
  assignSiteAdmin,
  sendSiteAdminAccessEmail,
  removeSiteAdminAccess,
  removeSiteAdminUser,
  addSiteAdminActivity
} = require("../controllers/adminController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post("/admin/create-site/research", authMiddleware, adminMiddleware, asyncHandler(researchCreateSite));
router.post("/admin/create-site", authMiddleware, adminMiddleware, asyncHandler(createSite));
router.post("/admin/sites/:siteId/activate-pages", authMiddleware, adminMiddleware, asyncHandler(activatePages));
router.delete("/admin/sites/:siteId/pages", authMiddleware, adminMiddleware, asyncHandler(deactivatePages));
router.get("/admin/patches", authMiddleware, adminMiddleware, asyncHandler(listPatches));
router.get("/admin/patches/runs", authMiddleware, adminMiddleware, asyncHandler(listPatchRuns));
router.delete("/admin/patches/runs/:sitePatchRunId", authMiddleware, adminMiddleware, asyncHandler(deletePatchRun));
router.post("/admin/patches/:patchId/preview", authMiddleware, adminMiddleware, asyncHandler(previewPatch));
router.post("/admin/patches/:patchId/apply", authMiddleware, adminMiddleware, asyncHandler(applyPatch));
router.get("/admin/site-admins", authMiddleware, adminMiddleware, asyncHandler(listSiteAdmins));
router.post("/admin/site-admins", authMiddleware, adminMiddleware, asyncHandler(assignSiteAdmin));
router.post("/admin/site-admins/:userId/send-access-email", authMiddleware, adminMiddleware, asyncHandler(sendSiteAdminAccessEmail));
router.post("/admin/site-admins/:userId/sites/:siteId/activity", authMiddleware, adminMiddleware, asyncHandler(addSiteAdminActivity));
router.delete("/admin/site-admins/:userId/sites/:siteId", authMiddleware, adminMiddleware, asyncHandler(removeSiteAdminAccess));
router.delete("/admin/site-admins/:userId", authMiddleware, adminMiddleware, asyncHandler(removeSiteAdminUser));

module.exports = router;
