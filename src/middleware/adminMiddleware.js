const env = require("../config/env");

function adminMiddleware(req, res, next) {
  if (!req.auth?.email || req.auth.email.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({
      error: "Admin access required"
    });
  }

  return next();
}

module.exports = {
  adminMiddleware
};
