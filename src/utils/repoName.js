const { slugify } = require("./slugify");
const { isoDate } = require("./timestamps");

function buildRepoName(companyName, date = new Date()) {
  const slug = slugify(companyName) || 'site';
  return `${slug}-${isoDate(date)}`;
}

module.exports = {
  buildRepoName
};
