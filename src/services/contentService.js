const githubIntegration = require("../integrations/github/githubIntegration");
const siteService = require("./siteService");
const { CONTENT_FILES } = require("../constants/contentFiles");
const { homeContentSchema } = require("../validators/contentSchemas");

async function getHomeContent(siteId) {
  const site = await siteService.getSiteById(siteId);
  const file = await githubIntegration.getFileContent({
    owner: site.repo_owner,
    repo: site.repo_name,
    path: CONTENT_FILES.HOME.path,
    branch: site.branch
  });

  return {
    site,
    sha: file.sha,
    content: homeContentSchema.parse(file.content)
  };
}

async function saveHomeContent(siteId, payload, actor) {
  const content = homeContentSchema.parse(payload);
  const site = await siteService.getSiteById(siteId);
  const current = await githubIntegration.getFileContent({
    owner: site.repo_owner,
    repo: site.repo_name,
    path: CONTENT_FILES.HOME.path,
    branch: site.branch
  });

  try {
    const result = await githubIntegration.updateJsonFile({
      owner: site.repo_owner,
      repo: site.repo_name,
      path: CONTENT_FILES.HOME.path,
      branch: site.branch,
      content,
      sha: current.sha,
      message: `Update home content for site ${siteId} by ${actor.userId}`
    });

    return {
      site,
      sha: result.contentSha,
      commitSha: result.commitSha,
      content
    };
  } catch (error) {
    if (error.status === 409) {
      const conflictError = new Error("GitHub content conflict");
      conflictError.statusCode = 409;
      throw conflictError;
    }

    throw error;
  }
}

module.exports = {
  getHomeContent,
  saveHomeContent
};
