const path = require("path");
const githubIntegration = require("../integrations/github/githubIntegration");
const aiIntegration = require("../integrations/ai/contentGenerationIntegration");
const { slugify } = require("../utils/slugify");

const MIME_EXTENSION_MAP = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/gif": ".gif",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico"
};

function fileExtensionFromMime(mimeType) {
  const normalizedMimeType = String(mimeType || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  return MIME_EXTENSION_MAP[normalizedMimeType] || ".png";
}

function fileExtensionFromUrl(value) {
  try {
    const pathname = new URL(value).pathname;
    const extension = path.extname(pathname).toLowerCase();
    return extension || null;
  } catch (error) {
    return null;
  }
}

async function remoteUrlToDataUrl(url) {
  const response = await fetch(url);

  if (!response.ok) {
    const error = new Error(`Failed to download image from ${url}`);
    error.statusCode = 502;
    throw error;
  }

  const contentType = (response.headers.get("content-type") || "image/png")
    .split(";", 1)[0]
    .trim();
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    dataUrl: `data:${contentType};base64,${buffer.toString("base64")}`,
    mimeType: contentType,
    extension: fileExtensionFromUrl(url) || fileExtensionFromMime(contentType)
  };
}

function dataUrlInfo(value) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(value || "");

  if (!match) {
    const error = new Error("Invalid base64 image payload");
    error.statusCode = 400;
    throw error;
  }

  return {
    dataUrl: value,
    mimeType: match[1],
    extension: fileExtensionFromMime(match[1])
  };
}

async function resolveImageSource(imageInput) {
  if (!imageInput?.value) {
    return null;
  }

  if (imageInput.type === "base64") {
    return dataUrlInfo(imageInput.value);
  }

  if (imageInput.type === "url") {
    return remoteUrlToDataUrl(imageInput.value);
  }

  const error = new Error("Unsupported image input type");
  error.statusCode = 400;
  throw error;
}

async function uploadImage({ owner, repo, branch, siteId, fileNameBase, imageInput }) {
  const source = await resolveImageSource(imageInput);

  if (!source) {
    return null;
  }

  const filePath = `assets/generated/${fileNameBase}${source.extension}`;

  await githubIntegration.uploadBase64File({
    owner,
    repo,
    branch,
    path: filePath,
    base64Content: source.dataUrl,
    message: `Upload site asset ${fileNameBase} for site ${siteId}`
  });

  return filePath;
}

async function uploadSiteAssets({ owner, repo, branch, siteId, input }) {
  const baseSlug = slugify(input.displayName || input.companyName || siteId) || siteId;

  const logoUrl = input.logo?.value
    ? await uploadImage({
        owner,
        repo,
        branch,
        siteId,
        fileNameBase: `${baseSlug}-logo`,
        imageInput: input.logo
      })
    : null;

  const faviconUrl = input.favicon?.value
    ? await uploadImage({
        owner,
        repo,
        branch,
        siteId,
        fileNameBase: `${baseSlug}-favicon`,
        imageInput: input.favicon
      })
    : null;

  const userImages = [];

  for (let index = 0; index < (input.images || []).length; index += 1) {
    const uploadedPath = await uploadImage({
      owner,
      repo,
      branch,
      siteId,
      fileNameBase: `${baseSlug}-user-${index + 1}`,
      imageInput: input.images[index]
    });

    if (uploadedPath) {
      userImages.push(uploadedPath);
    }
  }

  const aiImages = [];

  if (userImages.length === 0) {
    const aiImageInputs = await aiIntegration.generateMarketingImages({ siteId, input });

    for (const image of aiImageInputs) {
      const uploadedPath = await uploadImage({
        owner,
        repo,
        branch,
        siteId,
        fileNameBase: `${baseSlug}-ai-${image.slot}`,
        imageInput: image
      });

      if (uploadedPath) {
        aiImages.push({
          slot: image.slot,
          url: uploadedPath
        });
      }
    }
  }

  return {
    logoUrl,
    faviconUrl,
    userImages,
    aiImages
  };
}

module.exports = {
  uploadImage,
  uploadSiteAssets
};
