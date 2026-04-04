const patchId = "2026-04-gallery-explicit-items";

const allowedFiles = ["index.js"];

const currentGalleryFunction = [
  "function renderGallery(content) {",
  "    var section = document.getElementById('gallery');",
  "    var navLink = document.getElementById('gallery-nav-link');",
  "    var heading = document.getElementById('gallery-heading');",
  "    var grid = document.getElementById('gallery-grid');",
  "    if (!section || !navLink || !heading || !grid) return;",
  "",
  "    var galleryItems = (content.media && Array.isArray(content.media.gallery) ? content.media.gallery : []).filter(function (item) {",
  "      return item && item.url;",
  "    });",
  "",
  "    var visible = galleryItems.length > 0;",
  "    section.hidden = !visible;",
  "    navLink.hidden = !visible;",
  "",
  "    if (!visible) {",
  "      grid.innerHTML = '';",
  "      return;",
  "    }",
  "",
  "    setText('gallery-heading', (content.media && content.media.galleryHeading) || 'Inblick i verksamheten');",
  "    grid.innerHTML = galleryItems.map(function (item) {",
  "      return [",
  "        '<figure class=\"gallery-card\">',",
  "        '  <img class=\"gallery-card__image\" src=\"' + escapeHtml(item.url) + '\" alt=\"' + escapeHtml(item.alt || '') + '\">',",
  "        '</figure>'",
  "      ].join('');",
  "    }).join('');",
  "  }"
].join("\n");

function replaceGalleryFunction(text) {
  if (text.includes(currentGalleryFunction)) {
    return {
      status: "already_applied",
      text,
      changed: false,
      reason: "Patchen finns redan i index.js."
    };
  }

  const blockPattern = /function renderGallery\(content\) \{[\s\S]*?\n  \}\n\n  function renderSocialLinks\(content\) \{/;
  const match = text.match(blockPattern);

  if (!match) {
    return {
      status: "conflict_or_customized",
      reason: "index.js innehåller inte den förväntade gallery-funktionen och kan inte patchas säkert."
    };
  }

  const galleryBlock = match[0];
  const looksLikeLegacyFilter = /reserved|heroImage|aboutImage|logoUrl|!reserved\.has\(item\.url\)|item\.url\s*!==/.test(galleryBlock);

  if (!looksLikeLegacyFilter) {
    return {
      status: "conflict_or_customized",
      reason: "Gallery-funktionen i index.js avviker från kända versioner och kräver manuell granskning."
    };
  }

  const nextText = text.replace(blockPattern, `${currentGalleryFunction}\n\n  function renderSocialLinks(content) {`);

  return {
    status: "applicable",
    text: nextText,
    changed: nextText !== text,
    reason: "Patchen uppdaterar index.js så att alla explicita media.gallery-poster visas."
  };
}

function detect({ files }) {
  const state = replaceGalleryFunction(files["index.js"]);

  return {
    status: state.status,
    reason: state.reason
  };
}

function apply({ files }) {
  const state = replaceGalleryFunction(files["index.js"]);

  if (state.status === "conflict_or_customized") {
    const error = new Error(state.reason);
    error.statusCode = 409;
    error.details = {
      status: state.status,
      file: "index.js"
    };
    throw error;
  }

  if (!state.changed) {
    return {
      filesToUpdate: [],
      changedFiles: [],
      summary: "Patchen är redan applicerad."
    };
  }

  return {
    filesToUpdate: [
      {
        path: "index.js",
        content: state.text,
        kind: "text"
      }
    ],
    changedFiles: ["index.js"],
    summary: "Patchen uppdaterar index.js så att galleriet alltid visar alla explicita media.gallery-poster, även om samma bild används i hero, about eller logo."
  };
}

function buildConflictPullRequest({ templateFiles = {} }) {
  if (!templateFiles["index.js"]) {
    return {
      filesToUpdate: [],
      changedFiles: [],
      summary: "Ingen templatefil kunde hämtas för review-PR."
    };
  }

  return {
    filesToUpdate: [
      {
        path: "index.js",
        content: templateFiles["index.js"],
        kind: "text"
      }
    ],
    changedFiles: ["index.js"],
    summary: "En review-PR skapades med den aktuella template-versionen av index.js för gallery-fixen."
  };
}

module.exports = {
  patchId,
  title: "Show all explicit gallery items",
  description: "Ser till att alla bilder som ligger i media.gallery visas i galleriet, även om samma bild också används i hero, about eller logo.",
  createdAt: "2026-04-04",
  riskLevel: "medium",
  warning: "Patchen uppdaterar gallery-renderingen i index.js och hoppar över sajter där filen avviker från kända templateversioner.",
  allowedFiles,
  templateFallbackFiles: ["index.js"],
  detect,
  apply,
  buildConflictPullRequest
};
