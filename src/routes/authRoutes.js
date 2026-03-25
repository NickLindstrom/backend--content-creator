const express = require("express");
const { listMySites } = require("../controllers/authController");
const { asyncHandler } = require("../utils/asyncHandler");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me/sites", authMiddleware, asyncHandler(listMySites));

module.exports = router;
