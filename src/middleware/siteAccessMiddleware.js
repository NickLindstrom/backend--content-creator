const env = require("../config/env");
const membershipService = require("../services/membershipService");
const siteService = require("../services/siteService");

async function siteAccessMiddleware(req, res, next) {
  try {
    const isAdmin = req.auth?.email && req.auth.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();

    if (isAdmin) {
      const site = await siteService.getSiteById(req.params.siteId);
      req.siteAccess = {
        siteId: site.site_id,
        role: "admin"
      };
      return next();
    }

    const membership = await membershipService.getMembership(req.auth.userId, req.params.siteId);

    if (!membership) {
      return res.status(403).json({
        error: "Access denied for this site"
      });
    }

    req.siteAccess = {
      siteId: membership.site_id,
      role: membership.role
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  siteAccessMiddleware
};
