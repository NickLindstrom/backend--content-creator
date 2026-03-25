const contentService = require("../services/contentService");

async function getHomeContent(req, res) {
  const result = await contentService.getHomeContent(req.params.siteId);

  return res.json({
    data: result.content,
    meta: {
      siteId: req.params.siteId,
      sha: result.sha
    }
  });
}

async function saveHomeContent(req, res) {
  const result = await contentService.saveHomeContent(req.params.siteId, req.body, req.auth);

  return res.json({
    data: result.content,
    meta: {
      siteId: req.params.siteId,
      sha: result.sha,
      commitSha: result.commitSha
    }
  });
}

module.exports = {
  getHomeContent,
  saveHomeContent
};
