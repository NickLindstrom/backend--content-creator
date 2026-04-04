const galleryHeadingPatch = require("./galleryHeadingPatch");
const galleryExplicitItemsPatch = require("./galleryExplicitItemsPatch");

const patches = [galleryHeadingPatch, galleryExplicitItemsPatch];
const patchMap = new Map(patches.map((patch) => [patch.patchId, patch]));

function listSitePatches() {
  return patches.map((patch) => ({
    patchId: patch.patchId,
    title: patch.title,
    description: patch.description,
    createdAt: patch.createdAt,
    riskLevel: patch.riskLevel,
    warning: patch.warning,
    allowedFiles: patch.allowedFiles
  }));
}

function getSitePatch(patchId) {
  const patch = patchMap.get(patchId);

  if (!patch) {
    const error = new Error(`Unknown patch: ${patchId}`);
    error.statusCode = 404;
    throw error;
  }

  return patch;
}

module.exports = {
  listSitePatches,
  getSitePatch
};
