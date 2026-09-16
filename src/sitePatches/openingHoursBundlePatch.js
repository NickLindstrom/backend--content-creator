const { CONTENT_FILES } = require("../constants/contentFiles");

const patchId = "2026-09-opening-hours-bundle";
const templateFiles = [
  "main.css",
  "scripts/build.js",
  "src/template.html",
  "themes/classic/main.css",
  "themes/classic/template.html",
  "themes/editorial/main.css",
  "themes/editorial/template.html",
  "themes/showcase/index.js",
  "themes/showcase/main.css",
  "themes/showcase/template.html",
];
const allowedFiles = [CONTENT_FILES.HOME.path, ...templateFiles];

const requiredMarkers = {
  "main.css": [".site-footer__opening-hours", ".opening-hours-row"],
  "scripts/build.js": [
    "openingHoursSpecification",
    "site.organizationNumber",
    '"opening-hours-list"',
  ],
  "src/template.html": [
    'id="opening-hours"',
    'id="footer-organization-number"',
  ],
  "themes/classic/main.css": [
    ".site-footer__opening-hours",
    ".opening-hours-row",
  ],
  "themes/classic/template.html": [
    'id="opening-hours"',
    'id="footer-organization-number"',
  ],
  "themes/editorial/main.css": [
    ".editorial-footer__opening-hours",
    ".opening-hours-row",
  ],
  "themes/editorial/template.html": [
    'id="opening-hours"',
    'id="footer-organization-number"',
  ],
  "themes/showcase/index.js": [
    "openingHoursSpecification",
    "content.site.organizationNumber",
    'getElementById("opening-hours")',
  ],
  "themes/showcase/main.css": [
    ".showcase-footer__opening-hours",
    ".opening-hours-row",
  ],
  "themes/showcase/template.html": [
    'id="opening-hours"',
    'id="footer-organization-number"',
  ],
};

function hasOwn(value, key) {
  return Boolean(value && Object.prototype.hasOwnProperty.call(value, key));
}

function findOutdatedTemplateFiles(files) {
  return templateFiles.filter((filePath) => {
    const text = files[filePath] || "";
    return requiredMarkers[filePath].some((marker) => !text.includes(marker));
  });
}

function contentNeedsPatch(content) {
  return !(
    hasOwn(content?.site, "organizationNumber") &&
    hasOwn(content, "openingHours") &&
    hasOwn(content?.openingHours, "enabled") &&
    hasOwn(content?.openingHours, "alwaysOpen") &&
    hasOwn(content?.openingHours, "eyebrow") &&
    hasOwn(content?.openingHours, "heading") &&
    hasOwn(content?.openingHours, "body") &&
    Array.isArray(content?.openingHours?.days)
  );
}

function mergeContentFields(content) {
  const currentOpeningHours = content?.openingHours;
  const hasOpeningHours = Boolean(
    currentOpeningHours && typeof currentOpeningHours === "object",
  );

  return {
    ...content,
    site: {
      ...content.site,
      organizationNumber: content.site?.organizationNumber || "",
    },
    openingHours: {
      enabled: true,
      alwaysOpen: hasOpeningHours
        ? currentOpeningHours.alwaysOpen === true
        : true,
      eyebrow: "Öppettider",
      heading: "Öppettider",
      body: "",
      ...(hasOpeningHours ? currentOpeningHours : {}),
      days: Array.isArray(currentOpeningHours?.days)
        ? currentOpeningHours.days
        : [],
    },
  };
}

function detect({ files, content }) {
  const outdatedFiles = findOutdatedTemplateFiles(files);

  if (outdatedFiles.length) {
    return {
      status: "conflict_or_customized",
      reason: `Stödet för öppettider eller organisationsnummer saknas i ${outdatedFiles.join(", ")}. Filerna behöver synkas via en gransknings-PR.`,
    };
  }

  if (contentNeedsPatch(content)) {
    return {
      status: "applicable",
      reason:
        "Renderingsstödet finns redan. Saknade innehållsfält kan läggas till utan att befintliga värden skrivs över.",
    };
  }

  return {
    status: "already_applied",
    reason: "Stöd och innehållsfält för öppettider finns redan.",
  };
}

function apply({ files, content }) {
  const outdatedFiles = findOutdatedTemplateFiles(files);

  if (outdatedFiles.length) {
    const error = new Error(
      `Templatefilerna måste granskas innan de ersätts: ${outdatedFiles.join(", ")}.`,
    );
    error.statusCode = 409;
    error.details = {
      status: "conflict_or_customized",
      files: outdatedFiles,
    };
    throw error;
  }

  if (!contentNeedsPatch(content)) {
    return {
      filesToUpdate: [],
      changedFiles: [],
      summary: "Patchen är redan applicerad.",
    };
  }

  return {
    filesToUpdate: [
      {
        path: CONTENT_FILES.HOME.path,
        content: mergeContentFields(content),
        kind: "json",
      },
    ],
    changedFiles: [CONTENT_FILES.HOME.path],
    summary:
      "content/home.json kompletterades med öppettider och organisationsnummer. Befintliga värden bevarades.",
  };
}

function buildConflictPullRequest({ content, templateFiles: sourceFiles = {} }) {
  const filesToUpdate = templateFiles
    .filter((filePath) => sourceFiles[filePath])
    .map((filePath) => ({
      path: filePath,
      content: sourceFiles[filePath],
      kind: "text",
    }));

  if (contentNeedsPatch(content)) {
    filesToUpdate.push({
      path: CONTENT_FILES.HOME.path,
      content: mergeContentFields(content),
      kind: "json",
    });
  }

  return {
    filesToUpdate,
    changedFiles: filesToUpdate.map((file) => file.path),
    summary:
      "En gransknings-PR skapades med aktuellt stöd för öppettider och organisationsnummer. Kundens innehåll bevarades.",
  };
}

module.exports = {
  patchId,
  title: "Öppettider och organisationsnummer",
  description:
    "Lägger till aktuellt stöd för öppettider, strukturerad data och organisationsnummer i samtliga teman.",
  createdAt: "2026-09-16",
  riskLevel: "high",
  warning:
    "Äldre eller kundanpassade templatefiler uppdateras endast via en gransknings-PR. Inga CSP- eller säkerhetsinställningar ändras.",
  allowedFiles,
  templateFallbackFiles: templateFiles,
  detect,
  apply,
  buildConflictPullRequest,
};
