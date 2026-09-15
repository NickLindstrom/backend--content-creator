const githubIntegration = require("../integrations/github/githubIntegration");
const siteService = require("./siteService");

async function activatePages(siteId) {
  const site = await siteService.getSiteById(siteId);

  const pagesSite = await githubIntegration.enablePagesSite({
    owner: site.repo_owner,
    repo: site.repo_name,
  });

  await siteService.updateSiteRecord(site.site_id, {
    public_url: pagesSite.htmlUrl,
  });

  return {
    siteId: site.site_id,
    repoName: site.repo_name,
    pagesUrl: pagesSite.htmlUrl,
    status: pagesSite.status,
  };
}

async function deactivatePages(siteId) {
  const site = await siteService.getSiteById(siteId);

  const pagesResult = await githubIntegration.disablePagesSite({
    owner: site.repo_owner,
    repo: site.repo_name,
  });

  await siteService.deleteSiteRecord(site.site_id);

  return {
    siteId: site.site_id,
    repoName: site.repo_name,
    unpublished: pagesResult.unpublished,
    deletedFromSupabase: true,
  };
}

module.exports = {
  activatePages,
  deactivatePages,
};
