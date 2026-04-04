const { CONTENT_FILES } = require("../constants/contentFiles");

const patchId = "2026-04-gallery-heading";
const defaultGalleryHeading = "Inblick i verksamheten";

const allowedFiles = [
  CONTENT_FILES.HOME.path,
  "index.js",
  "src/template.html",
  "index.html"
];

function replaceRegex(text, search, replacement) {
  if (!search.test(text)) {
    return null;
  }

  return text.replace(search, replacement);
}

function patchTextFile(text, mutations) {
  let nextText = text;
  let changed = false;

  for (const mutation of mutations) {
    if (mutation.applied.test(nextText)) {
      continue;
    }

    const replaced = replaceRegex(nextText, mutation.search, mutation.replace);
    if (replaced == null) {
      return {
        status: "conflict_or_customized",
        reason: mutation.reason
      };
    }

    nextText = replaced;
    changed = true;
  }

  return {
    status: changed ? "applicable" : "already_applied",
    text: nextText,
    changed
  };
}

function hasGalleryHeading(content) {
  return Boolean(content?.media && Object.prototype.hasOwnProperty.call(content.media, "galleryHeading"));
}

const indexJsMutations = [
  {
    applied: /var heading = document\.getElementById\('gallery-heading'\);/,
    search: /var navLink = document\.getElementById\('gallery-nav-link'\);\r?\n\s*var grid = document\.getElementById\('gallery-grid'\);\r?\n\s*if \(!section \|\| !navLink \|\| !grid\) return;/,
    replace: [
      "var navLink = document.getElementById('gallery-nav-link');",
      "    var heading = document.getElementById('gallery-heading');",
      "    var grid = document.getElementById('gallery-grid');",
      "    if (!section || !navLink || !heading || !grid) return;"
    ].join("\n"),
    reason: "index.js matchar inte förväntad gallery-struktur och verkar vara kundanpassad."
  },
  {
    applied: /setText\('gallery-heading', \(content\.media && content\.media\.galleryHeading\) \|\| 'Inblick i verksamheten'\);/,
    search: /if \(!visible\) \{\r?\n\s*grid\.innerHTML = '';\r?\n\s*return;\r?\n\s*\}\r?\n\r?\n\s*grid\.innerHTML = galleryItems\.map\(function \(item\) \{/,
    replace: [
      "if (!visible) {",
      "      grid.innerHTML = '';",
      "      return;",
      "    }",
      "",
      "    setText('gallery-heading', (content.media && content.media.galleryHeading) || 'Inblick i verksamheten');",
      "    grid.innerHTML = galleryItems.map(function (item) {"
    ].join("\n"),
    reason: "index.js saknar den förväntade gallery-renderingen och kan inte patchas säkert."
  }
];

const templateMutations = [
  {
    applied: /<h2 id="gallery-heading" class="section-title">Inblick i verksamheten<\/h2>/,
    search: /<h2 class="section-title">Inblick i verksamheten<\/h2>/,
    replace: '<h2 id="gallery-heading" class="section-title">Inblick i verksamheten</h2>',
    reason: "Gallery-rubriken i HTML-filen avviker från förväntad template."
  },
  {
    applied: /"galleryHeading":\s*"Inblick i verksamheten"/,
    search: /("aboutImage":\s*\{\s*"url":\s*"",\s*"alt":\s*""\s*\},\s*)("gallery":\s*\[\])/, 
    replace: '$1"galleryHeading": "Inblick i verksamheten",\n          $2',
    reason: "Embedded example-content i HTML-filen matchar inte förväntad media-struktur."
  }
];

function describeChangedFiles(changedFiles) {
  if (!changedFiles.length) {
    return "Patchen är redan applicerad.";
  }

  return `Patchen uppdaterar ${changedFiles.join(", ")}.`;
}

function detect({ files, content }) {
  const fileStates = [
    patchTextFile(files["index.js"], indexJsMutations),
    patchTextFile(files["src/template.html"], templateMutations),
    patchTextFile(files["index.html"], templateMutations)
  ];

  const conflictState = fileStates.find((state) => state.status === "conflict_or_customized");
  if (conflictState) {
    return conflictState;
  }

  const contentNeedsPatch = !hasGalleryHeading(content);
  const textNeedsPatch = fileStates.some((state) => state.status === "applicable");

  if (!contentNeedsPatch && !textNeedsPatch) {
    return {
      status: "already_applied",
      reason: "Gallery heading-stödet finns redan på webbplatsen."
    };
  }

  return {
    status: "applicable",
    reason: describeChangedFiles([
      ...(textNeedsPatch ? allowedFiles.filter((filePath) => filePath !== CONTENT_FILES.HOME.path) : []),
      ...(contentNeedsPatch ? [CONTENT_FILES.HOME.path] : [])
    ])
  };
}

function apply({ files, content }) {
  const indexJsState = patchTextFile(files["index.js"], indexJsMutations);
  const templateState = patchTextFile(files["src/template.html"], templateMutations);
  const indexHtmlState = patchTextFile(files["index.html"], templateMutations);
  const changedFiles = [];
  const filesToUpdate = [];

  for (const [path, state] of [
    ["index.js", indexJsState],
    ["src/template.html", templateState],
    ["index.html", indexHtmlState]
  ]) {
    if (state.status === "conflict_or_customized") {
      const error = new Error(state.reason);
      error.statusCode = 409;
      error.details = {
        status: state.status,
        file: path
      };
      throw error;
    }

    if (state.changed) {
      changedFiles.push(path);
      filesToUpdate.push({
        path,
        content: state.text,
        kind: "text"
      });
    }
  }

  const nextContent = hasGalleryHeading(content)
    ? content
    : {
        ...content,
        media: {
          ...(content.media || {}),
          galleryHeading: defaultGalleryHeading
        }
      };

  if (!hasGalleryHeading(content)) {
    changedFiles.push(CONTENT_FILES.HOME.path);
    filesToUpdate.push({
      path: CONTENT_FILES.HOME.path,
      content: nextContent,
      kind: "json"
    });
  }

  return {
    filesToUpdate,
    changedFiles,
    summary: describeChangedFiles(changedFiles)
  };
}

module.exports = {
  patchId,
  title: "Gallery heading support",
  description: "Lägger till redigerbar galleryHeading i content/home.json och uppdaterar templatefilerna så gallerirubriken renderas dynamiskt.",
  createdAt: "2026-04-04",
  riskLevel: "medium",
  warning: "Patchen uppdaterar gallery-relaterade templatefiler och kräver att sajten fortfarande följer standardtemplaten.",
  allowedFiles,
  detect,
  apply
};