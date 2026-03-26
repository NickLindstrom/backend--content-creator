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

module.exports = {
  activatePages
};
