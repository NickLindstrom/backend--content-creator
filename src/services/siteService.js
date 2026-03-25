const dbIntegration = require("../integrations/supabase/dbIntegration");

async function getSitesForUser(userId) {
  const records = await dbIntegration.getSitesForUser(userId);

  return records.map((record) => ({
    role: record.role,
    ...record.sites
  }));
}

async function getSiteById(siteId) {
  const site = await dbIntegration.getSiteById(siteId);

  if (!site) {
    const error = new Error("Site not found");
    error.statusCode = 404;
    throw error;
  }

  return site;
}

async function createSiteRecord(site) {
  return dbIntegration.createSite(site);
}

module.exports = {
  getSitesForUser,
  getSiteById,
  createSiteRecord
};
