const { homeContentSchema } = require("../validators/contentSchemas");
const siteService = require("./siteService");
const templateSourceService = require("./templateSourceService");
const { getSiteTheme } = require("../constants/siteThemes");

function isAbsoluteUrl(value) {
  return /^(https?:)?\/\//.test(value) || String(value || "").startsWith("data:");
}

function resolveSiteAssetUrl(site, value, previewSources) {
  if (!value) {
    return value;
  }

  const override = previewSources[value];
  if (override) {
    return override;
  }

  if (isAbsoluteUrl(value)) {
    return value;
  }

  return `https://raw.githubusercontent.com/${site.repo_owner}/${site.repo_name}/${site.branch}/${String(value).replace(/^\//, "")}`;
}

function resolvePreviewContent(site, content, previewSources) {
  const parsed = homeContentSchema.parse(content);

  return {
    ...parsed,
    media: {
      ...parsed.media,
      logoUrl: parsed.media.logoUrl ? resolveSiteAssetUrl(site, parsed.media.logoUrl, previewSources) : parsed.media.logoUrl,
      heroImage: {
        ...parsed.media.heroImage,
        url: resolveSiteAssetUrl(site, parsed.media.heroImage.url, previewSources)
      },
      aboutImage: {
        ...parsed.media.aboutImage,
        url: resolveSiteAssetUrl(site, parsed.media.aboutImage.url, previewSources)
      },
      gallery: (parsed.media.gallery || []).map((item) => ({
        ...item,
        url: resolveSiteAssetUrl(site, item.url, previewSources)
      }))
    }
  };
}

function escapeInlineScriptJson(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function inlineTemplateCss(templateHtml, cssText, baseHref) {
  let nextHtml = templateHtml.replace(/<link\s+rel="stylesheet"\s+href="[^"]+"\s*\/?>/, `<style>${cssText}</style>`);

  if (nextHtml === templateHtml) {
    nextHtml = nextHtml.replace(/<\/head>/, `<style>${cssText}</style></head>`);
  }

  if (!/<base\s/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<\/head>/, `<base href="${baseHref}"></head>`);
  }

  return nextHtml;
}

function replaceInitialContent(templateHtml, content) {
  const json = escapeInlineScriptJson(content);
  const nextHtml = templateHtml.replace(
    /<script id="initial-content" type="application\/json">[\s\S]*?<\/script>/,
    `<script id="initial-content" type="application/json">\n${json}\n    </script>`
  );

  return nextHtml;
}

function buildTemplateRuntime(templateScript) {
  const fetchBlockPattern = /var embeddedContent = readEmbeddedContent\([\s\S]*?setupNavigation\(\);\r?\n\s*\}\);\r?\n\s*\}\)\(\);/;

  const replacement = [
    "var embeddedContent = readEmbeddedContent();",
    "  if (embeddedContent) {",
    "    applyContent(embeddedContent);",
    "  }",
    "",
    "  window.__contentCreatorApplyContent = applyContent;",
    "  setupNavigation();",
    "  window.dispatchEvent(new Event('contentcreator:preview-rendered'));",
    "})();"
  ].join("\n");

  const runtimeWithBridge = templateScript.replace(
    '  function setupNavigation() {',
    '  window.__contentCreatorApplyContent = applyContent;\n\n  function setupNavigation() {'
  );

  if (fetchBlockPattern.test(runtimeWithBridge)) {
    return runtimeWithBridge.replace(fetchBlockPattern, replacement);
  }

  return `${runtimeWithBridge}\nwindow.dispatchEvent(new Event('contentcreator:preview-rendered'));\n`;
}

function buildPreviewBridgeScript() {
  return `
(function () {
  var focusSelectors = [
    ['#header-brand', 'site.displayName'],
    ['#hero-eyebrow', 'hero.eyebrow'],
    ['#hero-headline', 'hero.headline'],
    ['#hero-subheadline', 'hero.subheadline'],
    ['#hero-primary-cta', 'hero.primaryCtaLabel'],
    ['#hero-visual-slot', 'media.heroImage.url'],
    ['#intro-heading', 'intro.heading'],
    ['#intro-body', 'intro.body'],
    ['#services-heading', 'services.heading'],
    ['#about-heading', 'about.heading'],
    ['#about-body', 'about.body'],
    ['#about-visual-slot', 'media.aboutImage.url'],
    ['#gallery-heading', 'media.galleryHeading'],
    ['#testimonials-heading', 'testimonials.heading'],
    ['#faq-heading', 'faq.heading'],
    ['#contact-heading', 'contact.heading'],
    ['#contact-body', 'contact.body'],
    ['#contact-phone', 'contact.phone'],
    ['#contact-email', 'contact.email'],
    ['#contact-address', 'contact.address'],
    ['#footer-brand', 'footer.companyName'],
    ['#footer-tagline', 'footer.tagline'],
    ['#footer-copyright', 'footer.copyright']
  ];

  var hashFocusMap = {
    '#services': 'services.heading',
    '#about': 'about.heading',
    '#gallery': 'media.galleryHeading',
    '#faq': 'faq.heading',
    '#contact': 'contact.heading'
  };

  var activeClassName = 'content-creator-preview-active';

  function ensureActiveStyles() {
    if (document.getElementById('content-creator-preview-active-style')) {
      return;
    }

    var style = document.createElement('style');
    style.id = 'content-creator-preview-active-style';
    style.textContent = '[data-preview-focus] { cursor: pointer; } .' + activeClassName + ' { outline: 3px solid rgba(245, 158, 11, 0.95) !important; outline-offset: 3px; box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.18) !important; }';
    document.head.appendChild(style);
  }

  function clearActiveState() {
    document.querySelectorAll('.' + activeClassName).forEach(function (element) {
      element.classList.remove(activeClassName);
    });
  }

  function markActive(element) {
    if (!element) return;
    clearActiveState();
    element.classList.add(activeClassName);
  }

  function mark(selector, focusPath) {
    var element = document.querySelector(selector);
    if (!element) return;
    element.setAttribute('data-preview-focus', focusPath);
  }

  function markIndexed(selector, prefix, childKey) {
    document.querySelectorAll(selector).forEach(function (element, index) {
      element.setAttribute('data-preview-focus', childKey ? prefix + '.' + index + '.' + childKey : prefix + '.' + index);
    });
  }

  function decorate() {
    ensureActiveStyles();
    focusSelectors.forEach(function (entry) { mark(entry[0], entry[1]); });
    markIndexed('#services-list .service-card', 'services.items', 'title');
    markIndexed('#testimonials-list .testimonial-card', 'testimonials.items', 'name');
    markIndexed('#faq-list .faq-item', 'faq.items', 'question');
    markIndexed('#gallery-grid .gallery-card', 'media.gallery', 'url');
  }

  window.addEventListener('message', function (event) {
    var data = event.data || {};
    if (data.type !== 'content-creator-preview-update' || !data.content) {
      return;
    }

    if (typeof window.__contentCreatorApplyContent !== 'function') {
      return;
    }

    window.__contentCreatorApplyContent(data.content);
    window.dispatchEvent(new Event('contentcreator:preview-rendered'));
  });

  document.addEventListener('click', function (event) {
    var interactiveTarget = event.target.closest('[data-preview-focus], a, button');
    if (!interactiveTarget) return;

    event.preventDefault();
    event.stopPropagation();

    var focusTarget = interactiveTarget.closest('[data-preview-focus]');
    var focusPath = focusTarget ? focusTarget.getAttribute('data-preview-focus') : '';

    if (!focusPath && interactiveTarget.matches('a[href], button')) {
      var href = interactiveTarget.getAttribute('href') || '';
      focusPath = hashFocusMap[href] || '';
    }

    if (!focusPath) {
      return;
    }

    markActive(focusTarget || interactiveTarget);

    window.parent.postMessage({
      type: 'content-creator-preview-focus',
      focusPath: focusPath
    }, '*');
  }, true);

  decorate();
  window.addEventListener('contentcreator:preview-rendered', decorate);
})();`;
}

function injectScripts(templateHtml, runtimeScript, bridgeScript) {
  const combinedScripts = `<script>${runtimeScript}</script><script>${bridgeScript}</script>`;
  const withoutTemplateScript = templateHtml.replace(/<script\s+defer\s+src="index\.js"\s*><\/script>/, "");

  if (/<\/body>/.test(withoutTemplateScript)) {
    return withoutTemplateScript.replace(/<\/body>/, `${combinedScripts}</body>`);
  }

  return `${withoutTemplateScript}${combinedScripts}`;
}

async function generateSitePreview({ siteId, content, previewSources = {} }) {
  const site = await siteService.getSiteById(siteId);
  const selectedTheme = getSiteTheme(content?.site?.theme);
  const files = await templateSourceService.getTemplateFiles([
    selectedTheme.templatePath,
    selectedTheme.stylesheetPath,
    'index.js'
  ]);

  const resolvedContent = resolvePreviewContent(site, content, previewSources);
  const baseHref = templateSourceService.getTemplateAssetUrl('');
  const htmlWithCss = inlineTemplateCss(files[selectedTheme.templatePath], files[selectedTheme.stylesheetPath], baseHref);
  const htmlWithContent = replaceInitialContent(htmlWithCss, resolvedContent);
  const runtimeScript = buildTemplateRuntime(files['index.js']);
  const bridgeScript = buildPreviewBridgeScript();
  const html = injectScripts(htmlWithContent, runtimeScript, bridgeScript);

  return {
    mode: 'template',
    html,
    templateRef: templateSourceService.getTemplateRef()
  };
}

async function buildSitePreviewResponse({ siteId, content, previewSources = {} }) {
  try {
    return await generateSitePreview({
      siteId,
      content,
      previewSources
    });
  } catch (error) {
    return {
      mode: 'fallback',
      reason: error.message || 'Template preview unavailable',
      templateRef: templateSourceService.getTemplateRef()
    };
  }
}

module.exports = {
  buildSitePreviewResponse
};
