const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { siteAccessMiddleware } = require("../middleware/siteAccessMiddleware");
const {
  getHomeContent,
  saveHomeContent,
  getWorkflowRunsStatus,
  uploadSiteAsset
} = require("../controllers/siteController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/sites/:siteId/content/home",
  authMiddleware,
  siteAccessMiddleware,
  asyncHandler(getHomeContent)
);

router.post(
  "/sites/:siteId/content/home",
  authMiddleware,
  siteAccessMiddleware,
  asyncHandler(saveHomeContent)
);

router.get(
  "/sites/:siteId/actions/runs",
  authMiddleware,
  siteAccessMiddleware,
  asyncHandler(getWorkflowRunsStatus)
);

router.post(
  "/sites/:siteId/assets",
  authMiddleware,
  siteAccessMiddleware,
  asyncHandler(uploadSiteAsset)
);

module.exports = router;