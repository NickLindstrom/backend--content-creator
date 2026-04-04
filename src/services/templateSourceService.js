const env = require("../config/env");
const githubIntegration = require("../integrations/github/githubIntegration");

const templateCache = new Map();

function getCacheKey(path) {
  return `${env.TEMPLATE_REPO_OWNER}/${env.TEMPLATE_REPO_NAME}/${env.TEMPLATE_REPO_BRANCH}:${path}`;
}

async function getTemplateFile(path) {
  const cacheKey = getCacheKey(path);
  const cached = templateCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const file = await githubIntegration.getTextFileContent({
    owner: env.TEMPLATE_REPO_OWNER,
    repo: env.TEMPLATE_REPO_NAME,
    path,
    branch: env.TEMPLATE_REPO_BRANCH
  });

  const value = {
    path,
    content: file.content,
    sha: file.sha,
    owner: env.TEMPLATE_REPO_OWNER,
    repo: env.TEMPLATE_REPO_NAME,
    branch: env.TEMPLATE_REPO_BRANCH
  };

  templateCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + env.TEMPLATE_CACHE_TTL_MS
  });

  return value;
}

async function getTemplateFiles(paths) {
  const uniquePaths = Array.from(new Set(paths));
  const files = await Promise.all(uniquePaths.map((path) => getTemplateFile(path)));

  return files.reduce((acc, file) => {
    acc[file.path] = file.content;
    return acc;
  }, {});
}

function getTemplateAssetUrl(path) {
  const normalizedPath = String(path || "").replace(/^\//, "");
  return `https://raw.githubusercontent.com/${env.TEMPLATE_REPO_OWNER}/${env.TEMPLATE_REPO_NAME}/${env.TEMPLATE_REPO_BRANCH}/${normalizedPath}`;
}

function getTemplateRef() {
  return {
    owner: env.TEMPLATE_REPO_OWNER,
    repo: env.TEMPLATE_REPO_NAME,
    branch: env.TEMPLATE_REPO_BRANCH
  };
}

function clearTemplateCache() {
  templateCache.clear();
}

module.exports = {
  getTemplateFile,
  getTemplateFiles,
  getTemplateAssetUrl,
  getTemplateRef,
  clearTemplateCache
};
