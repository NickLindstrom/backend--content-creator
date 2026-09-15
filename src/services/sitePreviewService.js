const { homeContentSchema } = require("../validators/contentSchemas");
const siteService = require("./siteService");
const templateSourceService = require("./templateSourceService");
const { getSiteTheme } = require("../constants/siteThemes");

function isAbsoluteUrl(value) {
  return (
    /^(https?:)?\/\//.test(value) || String(value || "").startsWith("data:")
  );
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
    services: {
      ...parsed.services,
      items: (parsed.services.items || []).map((item) => ({
        ...item,
        image: {
          ...(item.image || {}),
          url: resolveSiteAssetUrl(site, item.image?.url, previewSources),
        },
      })),
    },
    media: {
      ...parsed.media,
      logoUrl: parsed.media.logoUrl
        ? resolveSiteAssetUrl(site, parsed.media.logoUrl, previewSources)
        : parsed.media.logoUrl,
      heroImage: {
        ...parsed.media.heroImage,
        url: resolveSiteAssetUrl(
          site,
          parsed.media.heroImage.url,
          previewSources,
        ),
      },
      aboutImage: {
        ...parsed.media.aboutImage,
        url: resolveSiteAssetUrl(
          site,
          parsed.media.aboutImage.url,
          previewSources,
        ),
      },
      gallery: (parsed.media.gallery || []).map((item) => ({
        ...item,
        url: resolveSiteAssetUrl(site, item.url, previewSources),
      })),
    },
  };
}

function escapeInlineScriptJson(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function inlineTemplateCss(templateHtml, cssText, baseHref) {
  let nextHtml = templateHtml.replace(
    /<link\s+rel="stylesheet"\s+href="[^"]+"\s*\/?>/,
    `<style>${cssText}</style>`,
  );

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
    `<script id="initial-content" type="application/json">\n${json}\n    </script>`,
  );

  return nextHtml;
}

function buildTemplateRuntime(templateScript) {
  const fetchBlockPattern =
    /var embeddedContent = readEmbeddedContent\([\s\S]*?setupNavigation\(\);\r?\n\s*\}\);\r?\n\s*\}\)\(\);/;

  const replacement = [
    "var embeddedContent = readEmbeddedContent();",
    "  if (embeddedContent) {",
    "    applyContent(embeddedContent);",
    "  }",
    "",
    "  window.__contentCreatorApplyContent = applyContent;",
    "  setupNavigation();",
    "  window.dispatchEvent(new Event('contentcreator:preview-rendered'));",
    "})();",
  ].join("\n");

  const runtimeWithBridge = templateScript.replace(
    "  function setupNavigation() {",
    "  window.__contentCreatorApplyContent = applyContent;\n\n  function setupNavigation() {",
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
    ['#intro-eyebrow', 'intro.eyebrow'],
    ['#intro-body', 'intro.body'],
    ['#services-eyebrow', 'services.eyebrow'],
    ['#services-heading', 'services.heading'],
    ['#about-eyebrow', 'about.eyebrow'],
    ['#about-heading', 'about.heading'],
    ['#about-body', 'about.body'],
    ['#about-visual-slot', 'media.aboutImage.url'],
    ['#gallery-eyebrow', 'media.galleryEyebrow'],
    ['#gallery-heading', 'media.galleryHeading'],
    ['#testimonials-eyebrow', 'testimonials.eyebrow'],
    ['#testimonials-heading', 'testimonials.heading'],
    ['#faq-eyebrow', 'faq.eyebrow'],
    ['#faq-heading', 'faq.heading'],
    ['#opening-hours', 'openingHours.heading'],
    ['#opening-hours-eyebrow', 'openingHours.eyebrow'],
    ['#opening-hours-heading', 'openingHours.heading'],
    ['#opening-hours-body', 'openingHours.body'],
    ['#contact-eyebrow', 'contact.eyebrow'],
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
    '#opening-hours': 'openingHours.heading',
    '#contact': 'contact.heading'
  };

  var activeClassName = 'content-creator-preview-active';

  function ensureActiveStyles() {
    if (document.getElementById('content-creator-preview-active-style')) {
      return;
    }

    var style = document.createElement('style');
    style.id = 'content-creator-preview-active-style';
    style.textContent = [
      '[data-preview-focus] { cursor: pointer; }',
      '.' + activeClassName + ' { outline: 3px solid rgba(245, 158, 11, 0.95) !important; outline-offset: 3px; box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.18) !important; }',
      '.service-card__media { position: relative; overflow: hidden; }',
      '.service-card__image { width: 100%; height: 100%; object-fit: cover; }',
      '.service-card__badge { display: none !important; }',
      '.service-card__media--image::before, .service-card__media--image::after { display: none !important; }'
    ].join(' ');
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

  function findFocusElement(activeFieldPath) {
    if (!activeFieldPath) return null;

    var fallback = null;
    var elements = document.querySelectorAll('[data-preview-focus]');

    for (var index = 0; index < elements.length; index += 1) {
      var element = elements[index];
      var focusPath = element.getAttribute('data-preview-focus') || '';

      if (focusPath === activeFieldPath) {
        return element;
      }

      if (!fallback && (activeFieldPath.indexOf(focusPath + '.') === 0 || focusPath.indexOf(activeFieldPath + '.') === 0)) {
        fallback = element;
      }
    }

    return fallback;
  }

  function activateFieldPath(activeFieldPath, shouldScroll) {
    var element = findFocusElement(activeFieldPath);
    if (!element) return;

    markActive(element);

    if (shouldScroll) {
      element.scrollIntoView({
        block: 'center',
        behavior: 'smooth'
      });
    }
  }

  function getEmbeddedContent() {
    var element = document.getElementById('initial-content');
    if (!element) return null;

    try {
      return JSON.parse(element.textContent || 'null');
    } catch (error) {
      return null;
    }
  }

  function hasText(value) {
    return Boolean(String(value || '').trim());
  }

  function isSectionEnabled(content, key) {
    var section = content && content[key];
    return !section || section.enabled !== false;
  }

  function hasOpeningHours(content) {
    var days = content && content.openingHours && Array.isArray(content.openingHours.days)
      ? content.openingHours.days
      : [];

    return days.some(function (item) {
      return item && (item.closed === true || hasText(item.opens) || hasText(item.closes));
    });
  }

  function sectionEyebrow(content, key, fallback) {
    var section = content && content[key];
    return section && hasText(section.eyebrow) ? section.eyebrow : fallback;
  }

  function setHiddenBySelector(selector, hidden) {
    document.querySelectorAll(selector).forEach(function (element) {
      element.hidden = hidden;
    });
  }

  function setTextBySelector(selector, value) {
    document.querySelectorAll(selector).forEach(function (element) {
      element.textContent = value || '';
    });
  }

  function setSectionEyebrow(sectionSelector, eyebrowSelector, value, focusPath) {
    var targets = [];

    document.querySelectorAll(eyebrowSelector).forEach(function (element) {
      targets.push(element);
    });

    document.querySelectorAll(sectionSelector).forEach(function (section) {
      var fallback = section.querySelector('.section-eyebrow, .editorial-kicker, .showcase-kicker');
      if (fallback) {
        targets.push(fallback);
      }
    });

    targets.forEach(function (element) {
      element.textContent = value || '';
      element.setAttribute('data-preview-focus', focusPath);
    });
  }

  function applySectionControls(content) {
    var contactVisible = isSectionEnabled(content, 'contact');
    var heroVisible = isSectionEnabled(content, 'hero');
    var introVisible = isSectionEnabled(content, 'intro');
    var servicesVisible = isSectionEnabled(content, 'services');
    var aboutVisible = isSectionEnabled(content, 'about');
    var galleryVisible = !content.media || content.media.galleryEnabled !== false;
    var testimonialsVisible = isSectionEnabled(content, 'testimonials');
    var faqVisible = isSectionEnabled(content, 'faq');
    var openingHoursVisible = isSectionEnabled(content, 'openingHours') && hasOpeningHours(content);
    var footerVisible = isSectionEnabled(content, 'footer');

    setHiddenBySelector('#top', !heroVisible);
    setHiddenBySelector('#intro-section', !introVisible);
    setHiddenBySelector('#services', !servicesVisible);
    setHiddenBySelector('#services-nav-link', !servicesVisible);
    setHiddenBySelector('#about', !aboutVisible);
    setHiddenBySelector('#about-nav-link', !aboutVisible);
    setHiddenBySelector('#gallery', !galleryVisible);
    setHiddenBySelector('#gallery-nav-link', !galleryVisible);
    setHiddenBySelector('#testimonials-section', !testimonialsVisible);
    setHiddenBySelector('#faq', !faqVisible);
    setHiddenBySelector('#opening-hours', !openingHoursVisible);
    setHiddenBySelector('#contact', !contactVisible);
    setHiddenBySelector('#nav-cta-link, #hero-primary-cta', !contactVisible);
    setHiddenBySelector('#site-footer, footer.site-footer, footer.editorial-footer, footer.showcase-footer', !footerVisible);

    setTextBySelector('#hero-eyebrow', content.hero && content.hero.eyebrow);
    setSectionEyebrow('#intro-section', '#intro-eyebrow', sectionEyebrow(content, 'intro', 'Introduktion'), 'intro.eyebrow');
    setSectionEyebrow('#services', '#services-eyebrow', sectionEyebrow(content, 'services', 'Tjänster'), 'services.eyebrow');
    setSectionEyebrow('#about', '#about-eyebrow', sectionEyebrow(content, 'about', 'Om oss'), 'about.eyebrow');
    setSectionEyebrow('#gallery', '#gallery-eyebrow', (content.media && content.media.galleryEyebrow) || 'Bilder', 'media.galleryEyebrow');
    setSectionEyebrow('#testimonials-section', '#testimonials-eyebrow', sectionEyebrow(content, 'testimonials', 'Omdömen'), 'testimonials.eyebrow');
    setSectionEyebrow('#faq', '#faq-eyebrow', sectionEyebrow(content, 'faq', 'FAQ'), 'faq.eyebrow');
    setSectionEyebrow('#opening-hours', '#opening-hours-eyebrow', sectionEyebrow(content, 'openingHours', 'Öppettider'), 'openingHours.eyebrow');
    setTextBySelector('#opening-hours-heading', content.openingHours && content.openingHours.heading);
    setTextBySelector('#opening-hours-body', content.openingHours && content.openingHours.body);
    setSectionEyebrow('#contact', '#contact-eyebrow', sectionEyebrow(content, 'contact', 'Kontakt'), 'contact.eyebrow');
  }

  function applyServiceImages(content) {
    var items = content && content.services && Array.isArray(content.services.items)
      ? content.services.items
      : [];

    document.querySelectorAll('#services-list .service-card').forEach(function (card, index) {
      card.querySelectorAll('.service-card__badge').forEach(function (badge) {
        badge.remove();
      });

      var media = card.querySelector('.service-card__media');
      if (!media) return;

      var item = items[index] || {};
      var image = item.image || {};
      var imageUrl = image.url || '';
      var existingImage = media.querySelector('.service-card__image');

      if (!imageUrl) {
        media.classList.remove('service-card__media--image');
        if (existingImage) {
          existingImage.remove();
        }
        return;
      }

      if (!existingImage) {
        existingImage = document.createElement('img');
        existingImage.className = 'service-card__image';
        existingImage.loading = 'lazy';
        media.insertBefore(existingImage, media.firstChild);
      }

      existingImage.src = imageUrl;
      existingImage.alt = image.alt || item.title || '';
      media.classList.add('service-card__media--image');
    });
  }

  function applyPreviewMediaSettings(content) {
    var site = (content && content.site) || {};
    var media = (content && content.media) || {};
    var logoWidth = media.logoWidth || '42px';
    var imageRatio = media.imageRatio || '4 / 3';
    var headingFont = site.headingFont || 'Georgia, "Times New Roman", serif';
    var bodyFont = site.bodyFont || 'Arial, sans-serif';
    var headerBackgroundColor = site.headerBackgroundColor || '';
    var mainBackgroundColor = site.mainBackgroundColor || '';
    var footerBackgroundColor = site.footerBackgroundColor || '';
    var headerLogoOnly = Boolean(media.headerLogoOnly && media.logoUrl);

    document.documentElement.style.setProperty('--content-image-ratio', imageRatio);
    document.documentElement.style.setProperty('--font-heading', headingFont);
    document.documentElement.style.setProperty('--font-body', bodyFont);
    document.documentElement.style.setProperty('--serif', headingFont);
    document.documentElement.style.setProperty('--sans', bodyFont);

    if (document.body) {
      document.body.style.fontFamily = bodyFont;
    }

    if (headerBackgroundColor) {
      document.documentElement.style.setProperty('--site-header-bg', headerBackgroundColor);
    } else {
      document.documentElement.style.removeProperty('--site-header-bg');
    }

    if (mainBackgroundColor) {
      document.documentElement.style.setProperty('--site-main-bg', mainBackgroundColor);
    } else {
      document.documentElement.style.removeProperty('--site-main-bg');
    }

    if (footerBackgroundColor) {
      document.documentElement.style.setProperty('--site-footer-bg', footerBackgroundColor);
    } else {
      document.documentElement.style.removeProperty('--site-footer-bg');
    }

    if (site.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', site.primaryColor);
      document.documentElement.style.setProperty('--color-primary-dark', site.primaryColor);
      document.documentElement.style.setProperty('--editorial-accent', site.primaryColor);
      document.documentElement.style.setProperty('--accent', site.primaryColor);
      document.documentElement.style.setProperty('--accent-deep', site.primaryColor);
    }

    if (site.secondaryColor) {
      document.documentElement.style.setProperty('--color-secondary', site.secondaryColor);
      document.documentElement.style.setProperty('--color-accent', site.secondaryColor);
      document.documentElement.style.setProperty('--editorial-accent-soft', site.secondaryColor);
      document.documentElement.style.setProperty('--accent-strong', site.secondaryColor);
    }

    document.querySelectorAll('.hero-visual__main-card, .about-media__image-frame, .gallery-card').forEach(function (element) {
      element.style.aspectRatio = imageRatio;
    });

    document.querySelectorAll('.hero-visual__image, .about-media__image, .gallery-card__image, .service-card__image').forEach(function (image) {
      image.style.width = '100%';
      image.style.height = '100%';
      image.style.objectFit = 'cover';
    });

    document.querySelectorAll('h1, h2, h3, h4, .hero-title, .section-title, .editorial-display, .editorial-title, .showcase-display, .showcase-title').forEach(function (element) {
      element.style.fontFamily = headingFont;
    });

    document.querySelectorAll('p, a, button, input, textarea, select, li, span, .section-text, .editorial-copy, .editorial-lead, .showcase-copy, .showcase-lead, .site-navigation__link, .editorial-nav__link, .showcase-nav__link').forEach(function (element) {
      element.style.fontFamily = bodyFont;
    });

    document.querySelectorAll('.site-header, .editorial-header, .showcase-header').forEach(function (element) {
      element.style.background = headerBackgroundColor;
    });

    document.querySelectorAll('#main-content, main').forEach(function (element) {
      element.style.background = mainBackgroundColor;
    });

    document.querySelectorAll('.site-footer, .editorial-footer, .showcase-footer, footer').forEach(function (element) {
      element.style.background = footerBackgroundColor;
    });

    var headerBrand = document.getElementById('header-brand');
    if (headerBrand) {
      headerBrand.classList.toggle('brand-mark--logo-only', headerLogoOnly);
      headerBrand.classList.toggle('editorial-brand--logo-only', headerLogoOnly);
      headerBrand.classList.toggle('showcase-brand--logo-only', headerLogoOnly);

      var headerLogo = headerBrand.querySelector('img');
      if (headerLogo) {
        headerLogo.style.width = logoWidth;
        headerLogo.style.height = 'auto';
      }

      var headerText = headerBrand.querySelector('.brand-mark__text');
      if (headerText) {
        headerText.hidden = headerLogoOnly;
      }
    }

    var footerBrand = document.getElementById('footer-brand');
    if (footerBrand) {
      var footerLogo = footerBrand.querySelector('img');
      if (footerLogo) {
        footerLogo.style.width = logoWidth;
        footerLogo.style.height = 'auto';
      }

      var footerText = footerBrand.querySelector('.brand-mark__text');
      if (footerText) {
        footerText.hidden = false;
      }
    }
  }

  function decorate() {
    ensureActiveStyles();
    focusSelectors.forEach(function (entry) { mark(entry[0], entry[1]); });
    var currentContent = window.__contentCreatorLastContent || getEmbeddedContent() || {};
    applySectionControls(currentContent);
    document.querySelectorAll('.highlight-panel').forEach(function (element) {
      element.setAttribute('data-preview-focus', 'usp.heading');
    });
    markIndexed('#services-list .service-card', 'services.items', 'title');
    markIndexed('#testimonials-list .testimonial-card', 'testimonials.items', 'name');
    markIndexed('#faq-list .faq-item', 'faq.items', 'question');
    markIndexed('#opening-hours-list .opening-hours-row', 'openingHours.days', 'opens');
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

    window.__contentCreatorLastContent = data.content;
    window.__contentCreatorApplyContent(data.content);
    applyServiceImages(data.content);
    applyPreviewMediaSettings(data.content);
    applySectionControls(data.content);
    decorate();
    activateFieldPath(data.activeFieldPath, true);
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

  var initialContent = window.__contentCreatorLastContent || getEmbeddedContent() || {};
  applyServiceImages(initialContent);
  applyPreviewMediaSettings(initialContent);
  applySectionControls(initialContent);
  decorate();
  activateFieldPath('', false);
  window.addEventListener('contentcreator:preview-rendered', decorate);
})();`;
}

function injectScripts(templateHtml, runtimeScript, bridgeScript) {
  const combinedScripts = `<script>${runtimeScript}</script><script>${bridgeScript}</script>`;
  const withoutTemplateScript = templateHtml.replace(
    /<script\s+defer\s+src="index\.js"\s*><\/script>/,
    "",
  );

  if (/<\/body>/.test(withoutTemplateScript)) {
    return withoutTemplateScript.replace(
      /<\/body>/,
      `${combinedScripts}</body>`,
    );
  }

  return `${withoutTemplateScript}${combinedScripts}`;
}

async function generateSitePreview({ siteId, content, previewSources = {} }) {
  const site = await siteService.getSiteById(siteId);
  const selectedTheme = getSiteTheme(content?.site?.theme);
  const files = await templateSourceService.getTemplateFiles([
    selectedTheme.templatePath,
    selectedTheme.stylesheetPath,
    "index.js",
  ]);

  const resolvedContent = resolvePreviewContent(site, content, previewSources);
  const baseHref = templateSourceService.getTemplateAssetUrl("");
  const htmlWithCss = inlineTemplateCss(
    files[selectedTheme.templatePath],
    files[selectedTheme.stylesheetPath],
    baseHref,
  );
  const htmlWithContent = replaceInitialContent(htmlWithCss, resolvedContent);
  const runtimeScript = buildTemplateRuntime(files["index.js"]);
  const bridgeScript = buildPreviewBridgeScript();
  const html = injectScripts(htmlWithContent, runtimeScript, bridgeScript);

  return {
    mode: "template",
    html,
    templateRef: templateSourceService.getTemplateRef(),
  };
}

async function buildSitePreviewResponse({
  siteId,
  content,
  previewSources = {},
}) {
  try {
    return await generateSitePreview({
      siteId,
      content,
      previewSources,
    });
  } catch (error) {
    return {
      mode: "fallback",
      reason: error.message || "Template preview unavailable",
      templateRef: templateSourceService.getTemplateRef(),
    };
  }
}

module.exports = {
  buildSitePreviewResponse,
};
