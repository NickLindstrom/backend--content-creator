const dbIntegration = require("../integrations/supabase/dbIntegration");

async function getSitesForUser(userId) {
  const records = await dbIntegration.getSitesForUser(userId);

  return records.map((record) => ({
    role: record.role,
    ...record.sites
  }));
}

async function getAllSites() {
  const records = await dbIntegration.getAllSites();

  return records.map((record) => ({
    role: "admin",
    ...record
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

async function getSiteByRepoName(repoName) {
  return dbIntegration.getSiteByRepoName(repoName);
}

async function createSiteRecord(site) {
  return dbIntegration.createSite(site);
}

async function updateSiteRecord(siteId, updates) {
  return dbIntegration.updateSite(siteId, updates);
}

async function deleteSiteRecord(siteId) {
  const deletedSite = await dbIntegration.deleteSite(siteId);

  if (!deletedSite) {
    const error = new Error("Site not found");
    error.statusCode = 404;
    throw error;
  }

  return deletedSite;
}

module.exports = {
  getSitesForUser,
  getAllSites,
  getSiteById,
  getSiteByRepoName,
  createSiteRecord,
  updateSiteRecord,
  deleteSiteRecord
};
