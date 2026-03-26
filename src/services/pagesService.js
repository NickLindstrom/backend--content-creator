const githubIntegration = require("../integrations/github/githubIntegration");
const siteService = require("./siteService");

async function activatePages(siteId) {
  const site = await siteService.getSiteById(siteId);

  const pagesSite = await githubIntegration.enablePagesSite({
    owner: site.repo_owner,
    repo: site.repo_name,
    branch: site.branch,
    path: "/"
  });

  return {
    siteId: site.site_id,
    repoName: site.repo_name,
    pagesUrl: pagesSite.htmlUrl,
    status: pagesSite.status
  };
}

async function deactivatePages(siteId) {
  const site = await siteService.getSiteById(siteId);

  const result = await githubIntegration.disablePagesSite({
    owner: site.repo_owner,
    repo: site.repo_name
  });

  return {
    siteId: site.site_id,
    repoName: site.repo_name,
    unpublished: result.unpublished
  };
}

module.exports = {
  activatePages,
  deactivatePages
};
