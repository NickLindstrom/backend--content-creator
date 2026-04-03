const githubIntegration = require("../integrations/github/githubIntegration");
const siteService = require("./siteService");

async function getWorkflowRunsStatus(siteId, commitSha) {
  const site = await siteService.getSiteById(siteId);

  try {
    const runs = await githubIntegration.listWorkflowRunsByCommit({
      owner: site.repo_owner,
      repo: site.repo_name,
      commitSha
    });

    const sortedRuns = [...runs].sort((left, right) => {
      const leftTime = Date.parse(left.createdAt || left.updatedAt || 0);
      const rightTime = Date.parse(right.createdAt || right.updatedAt || 0);
      return rightTime - leftTime;
    });

    const runsWithJobs = await Promise.all(
      sortedRuns.map(async (run) => ({
        ...run,
        jobs: await githubIntegration.listWorkflowJobs({
          owner: site.repo_owner,
          repo: site.repo_name,
          runId: run.id
        })
      }))
    );

    return {
      site,
      runs: runsWithJobs
    };
  } catch (error) {
    const wrappedError = new Error("Could not load GitHub Actions status");
    wrappedError.statusCode = 502;
    wrappedError.details = {
      provider: "github",
      providerStatus: error.status || error.statusCode || null
    };
    throw wrappedError;
  }
}

module.exports = {
  getWorkflowRunsStatus
};