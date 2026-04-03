const { githubClient } = require("./githubClient");
const { encodeJsonContent, encodeBase64Content, decodeJsonContent } = require("../../utils/githubContent");

async function getRepo({ owner, repo }) {
  try {
    const response = await githubClient.repos.get({ owner, repo });

    return {
      id: response.data.id,
      name: response.data.name,
      owner: response.data.owner.login,
      defaultBranch: response.data.default_branch,
      htmlUrl: response.data.html_url
    };
  } catch (error) {
    if (error.status === 404) {
      return null;
    }

    throw error;
  }
}

async function getPagesSite({ owner, repo }) {
  try {
    const response = await githubClient.request("GET /repos/{owner}/{repo}/pages", {
      owner,
      repo,
      headers: {
        accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });

    return {
      htmlUrl: response.data.html_url,
      status: response.data.status,
      source: response.data.source
    };
  } catch (error) {
    if (error.status === 404) {
      return null;
    }

    throw error;
  }
}

async function enablePagesSite({ owner, repo, branch, path = "/" }) {
  const existingSite = await getPagesSite({ owner, repo });

  const requestOptions = {
    owner,
    repo,
    build_type: "legacy",
    source: {
      branch,
      path
    },
    headers: {
      accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  };

  const response = existingSite
    ? await githubClient.request("PUT /repos/{owner}/{repo}/pages", requestOptions)
    : await githubClient.request("POST /repos/{owner}/{repo}/pages", requestOptions);

  return {
    htmlUrl: response.data.html_url,
    status: response.data.status,
    source: response.data.source
  };
}

async function disablePagesSite({ owner, repo }) {
  try {
    await githubClient.request("DELETE /repos/{owner}/{repo}/pages", {
      owner,
      repo,
      headers: {
        accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });

    return {
      unpublished: true
    };
  } catch (error) {
    if (error.status === 404) {
      return {
        unpublished: false
      };
    }

    throw error;
  }
}

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

async function getExistingFileSha({ owner, repo, path, branch }) {
  try {
    const response = await githubClient.repos.getContent({
      owner,
      repo,
      path,
      ref: branch
    });

    if (Array.isArray(response.data) || response.data.type !== "file") {
      return null;
    }

    return response.data.sha;
  } catch (error) {
    if (error.status === 404) {
      return null;
    }

    throw error;
  }
}

async function updateEncodedFile({ owner, repo, path, branch, content, message, sha }) {
  const resolvedSha = sha || (await getExistingFileSha({ owner, repo, path, branch }));
  const payload = {
    owner,
    repo,
    path,
    branch,
    message,
    content
  };

  if (resolvedSha) {
    payload.sha = resolvedSha;
  }

  const response = await githubClient.repos.createOrUpdateFileContents(payload);

  return {
    commitSha: response.data.commit.sha,
    contentSha: response.data.content?.sha || resolvedSha || null
  };
}

async function updateJsonFile({ owner, repo, path, branch, content, message, sha }) {
  return updateEncodedFile({
    owner,
    repo,
    path,
    branch,
    message,
    sha,
    content: encodeJsonContent(content)
  });
}

async function uploadBase64File({ owner, repo, path, branch, base64Content, message, sha }) {
  return updateEncodedFile({
    owner,
    repo,
    path,
    branch,
    message,
    sha,
    content: encodeBase64Content(base64Content)
  });
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

async function listWorkflowRunsByCommit({ owner, repo, commitSha }) {
  const response = await githubClient.actions.listWorkflowRunsForRepo({
    owner,
    repo,
    head_sha: commitSha,
    per_page: 100
  });

  return response.data.workflow_runs.map((run) => ({
    id: run.id,
    name: run.name,
    status: run.status,
    conclusion: run.conclusion,
    htmlUrl: run.html_url,
    createdAt: run.created_at,
    updatedAt: run.updated_at
  }));
}

async function listWorkflowJobs({ owner, repo, runId }) {
  const response = await githubClient.actions.listJobsForWorkflowRun({
    owner,
    repo,
    run_id: runId,
    per_page: 100
  });

  return response.data.jobs.map((job) => ({
    id: job.id,
    name: job.name,
    status: job.status,
    conclusion: job.conclusion,
    htmlUrl: job.html_url,
    startedAt: job.started_at,
    completedAt: job.completed_at
  }));
}

module.exports = {
  getRepo,
  getPagesSite,
  enablePagesSite,
  disablePagesSite,
  getFileContent,
  updateEncodedFile,
  updateJsonFile,
  uploadBase64File,
  createRepoFromTemplate,
  listWorkflowRunsByCommit,
  listWorkflowJobs
};