const membershipService = require("../services/membershipService");

async function siteAccessMiddleware(req, res, next) {
  try {
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
