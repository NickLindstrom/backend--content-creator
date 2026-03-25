const siteService = require("../services/siteService");

async function listMySites(req, res) {
  const sites = await siteService.getSitesForUser(req.auth.userId);
  return res.json({
    data: sites
  });
}

module.exports = {
  listMySites
};
