const { githubClient } = require("./githubClient");
const { encodeJsonContent, decodeJsonContent } = require("../../utils/githubContent");

async function getFileContent({ owner, repo, path, branch }) {
  const response = await githubClient.repos.getContent({
    owner,
    repo,
    path,
    ref: branch
  });

  if (Array.isArray(response.data) || response.data.type !== "file") {
    const error = new Error(`Expected file at ${path}`);
    error.statusCode = 500;
    throw error;
  }

  return {
    sha: response.data.sha,
    content: decodeJsonContent(response.data.content)
  };
}

async function updateJsonFile({ owner, repo, path, branch, content, message, sha }) {
  const payload = {
    owner,
    repo,
    path,
    branch,
    message,
    content: encodeJsonContent(content)
  };

  if (sha) {
    payload.sha = sha;
  }

  const response = await githubClient.repos.createOrUpdateFileContents(payload);

  return {
    commitSha: response.data.commit.sha,
    contentSha: response.data.content?.sha || sha || null
  };
}

async function createRepoFromTemplate({ owner, name, templateOwner, templateRepo, isPrivate = false }) {
  const response = await githubClient.repos.createUsingTemplate({
    template_owner: templateOwner,
    template_repo: templateRepo,
    owner,
    name,
    private: isPrivate,
    include_all_branches: false
  });

  return {
    id: response.data.id,
    name: response.data.name,
    owner: response.data.owner.login,
    defaultBranch: response.data.default_branch,
    htmlUrl: response.data.html_url
  };
}

module.exports = {
  getFileContent,
  updateJsonFile,
  createRepoFromTemplate
};
