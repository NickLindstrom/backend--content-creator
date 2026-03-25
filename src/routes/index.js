const express = require("express");
const authRoutes = require("./authRoutes");
const siteRoutes = require("./siteRoutes");
const adminRoutes = require("./adminRoutes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

router.use(authRoutes);
router.use(siteRoutes);
router.use(adminRoutes);

module.exports = router;
