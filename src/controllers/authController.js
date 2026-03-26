const env = require("../config/env");
const siteService = require("../services/siteService");

async function listMySites(req, res) {
  const isSuperAdmin = req.auth?.email && req.auth.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
  const sites = isSuperAdmin
    ? await siteService.getAllSites()
    : await siteService.getSitesForUser(req.auth.userId);

  return res.json({
    data: sites,
    meta: {
      isSuperAdmin
    }
  });
}

module.exports = {
  listMySites
};
