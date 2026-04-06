const githubIntegration = require('../integrations/github/githubIntegration');
const siteService = require('./siteService');
const siteRenderService = require('./siteRenderService');
const { CONTENT_FILES } = require('../constants/contentFiles');
const { homeContentSchema, contentPatchSchema } = require('../validators/contentSchemas');
const { deepMerge } = require('../utils/deepMerge');

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
  const patch = contentPatchSchema.parse(payload);
  const site = await siteService.getSiteById(siteId);
  const current = await githubIntegration.getFileContent({
    owner: site.repo_owner,
    repo: site.repo_name,
    path: CONTENT_FILES.HOME.path,
    branch: site.branch
  });
  const branchHead = await githubIntegration.getBranchHead({
    owner: site.repo_owner,
    repo: site.repo_name,
    branch: site.branch
  });

  const content = homeContentSchema.parse(deepMerge(current.content, patch));
    const sharedTemplateFiles = await siteRenderService.getSharedTemplateFiles();
  const renderedHtml = await siteRenderService.renderSiteHtml(content);

  try {
    const result = await githubIntegration.updateTextFiles({
      owner: site.repo_owner,
      repo: site.repo_name,
      branch: site.branch,
      expectedHeadSha: branchHead.commitSha,
      files: [
        {
          path: CONTENT_FILES.HOME.path,
          content: `${JSON.stringify(content, null, 2)}\n`
        },
        {
          path: CONTENT_FILES.INDEX.path,
          content: renderedHtml
        },
        ...sharedTemplateFiles
      ],
      message: `Update home content for site ${siteId} by ${actor.userId}`
    });

    return {
      site,
      sha: current.sha,
      commitSha: result.commitSha,
      content
    };
  } catch (error) {
    if (error.status === 409) {
      const conflictError = new Error('GitHub content conflict');
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