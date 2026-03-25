const { Octokit } = require("@octokit/rest");
const env = require("../../config/env");

const githubClient = new Octokit({
  auth: env.GITHUB_TOKEN
});

module.exports = {
  githubClient
};
