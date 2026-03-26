const fs = require("fs");
const path = require("path");

const templateRoot = path.resolve(__dirname, "..", "..", "..", "template--content-creator");
const templatePath = path.join(templateRoot, "src", "template.html");

function readTemplate() {
  return fs.readFileSync(templatePath, "utf8");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function get(obj, keyPath) {
  return keyPath.split(".").reduce((acc, key) => (acc && acc[key] != null ? acc[key] : ""), obj);
}

function localeFromLanguage(language) {
  return language === "sv" ? "sv_SE" : "en_US";
}

function firstMatchingAsset(assetUrls, matcher) {
  return assetUrls.find((url) => matcher(path.basename(url).toLowerCase())) || "";
}

function hasNonEmptyUrl(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function resolveMedia(content) {
  const configuredMedia = content.media || {};
  const assetUrls = Array.isArray(configuredMedia.gallery)
    ? configuredMedia.gallery.map((item) => item.url).filter(Boolean)
    : [];

  const galleryUrls = [...new Set(assetUrls)];
  const generatedLogoUrl = firstMatchingAsset(galleryUrls, (name) => name.includes("-logo."));
  const generatedHeroUrl = firstMatchingAsset(galleryUrls, (name) => name.includes("-ai-hero."));
  const generatedAboutUrl = firstMatchingAsset(galleryUrls, (name) => name.includes("-ai-about."));
  const generatedUserUrls = galleryUrls.filter((url) => path.basename(url).toLowerCase().includes("-user-"));

  const logoUrl = generatedLogoUrl || (hasNonEmptyUrl(configuredMedia.logoUrl) ? configuredMedia.logoUrl : "");
  const heroImageUrl =
    generatedUserUrls[0] ||
    generatedHeroUrl ||
    (hasNonEmptyUrl(configuredMedia.heroImage?.url) ? configuredMedia.heroImage.url : "");
  const aboutImageUrl =
    generatedUserUrls[1] ||
    generatedAboutUrl ||
    generatedUserUrls[0] ||
    (hasNonEmptyUrl(configuredMedia.aboutImage?.url) ? configuredMedia.aboutImage.url : "");

  const reserved = new Set([logoUrl, heroImageUrl, aboutImageUrl].filter(Boolean));
  const gallery = galleryUrls
    .filter((url) => !reserved.has(url))
    .map((url, index) => ({
      url,
      alt: `${content.site.displayName} bild ${index + 1}`
    }));

  return {
    logoUrl: logoUrl || null,
    heroImage: heroImageUrl
      ? {
          url: heroImageUrl,
          alt: configuredMedia.heroImage?.alt || `${content.site.displayName} hero-bild`
        }
      : null,
    aboutImage: aboutImageUrl
      ? {
          url: aboutImageUrl,
          alt: configuredMedia.aboutImage?.alt || `${content.site.displayName} verksamhetsbild`
        }
      : null,
    gallery
  };
}

function renderBrand({ companyName, logoUrl, className }) {
  const logo = logoUrl
    ? `<img class="brand-mark__logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)} logotyp">`
    : "";

  return `<a class="${escapeHtml(className)}" href="#top" aria-label="Till startsidan">${logo}<span class="brand-mark__text">${escapeHtml(companyName)}</span></a>`;
}

function renderServices(items) {
  return (items || [])
    .map((item) => `
    <article class="service-card">
      <div class="service-card__media">
        <span class="service-card__badge">Tjanst</span>
      </div>
      <h3 class="service-card__title">${escapeHtml(item.title)}</h3>
      <p class="service-card__text">${escapeHtml(item.description)}</p>
    </article>
  `)
    .join("");
}

function renderUsp(items) {
  return (items || []).map((item) => `<li class="usp-list__item">${escapeHtml(item)}</li>`).join("");
}

function renderTestimonials(testimonials) {
  if (!testimonials?.enabled) return "";

  const cards = (testimonials.items || [])
    .map((item) => `
    <article class="testimonial-card">
      <h3 class="testimonial-card__name">${escapeHtml(item.name)}</h3>
      <p class="testimonial-card__text">\"${escapeHtml(item.quote)}\"</p>
    </article>
  `)
    .join("");

  if (!cards) return "";

  return `
    <section class="testimonials-section section-spacing">
      <div class="site-container">
        <p class="section-eyebrow">Omdomen</p>
        <h2 class="section-title">${escapeHtml(testimonials.heading)}</h2>
        <div class="testimonials-grid">${cards}</div>
      </div>
    </section>
  `;
}

function renderFaq(faq) {
  if (!faq?.enabled) return "";

  const items = (faq.items || [])
    .map((item) => `
    <article class="faq-item">
      <h3 class="faq-item__question">${escapeHtml(item.question)}</h3>
      <p class="faq-item__answer">${escapeHtml(item.answer)}</p>
    </article>
  `)
    .join("");

  if (!items) return "";

  return `
    <section id="faq" class="faq-section section-spacing">
      <div class="site-container">
        <p class="section-eyebrow">FAQ</p>
        <h2 class="section-title">${escapeHtml(faq.heading)}</h2>
        <div class="faq-list">${items}</div>
      </div>
    </section>
  `;
}

function renderSocialLinks(links) {
  const entries = Object.entries(links || {}).filter(([, url]) => Boolean(url));
  if (!entries.length) {
    return '<span class="site-footer__meta">Inga sociala lankar angivna.</span>';
  }

  return entries
    .map(
      ([key, url]) =>
        `<a class="site-footer__social-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(key)}</a>`
    )
    .join("");
}

function renderGallery(gallery) {
  if (!Array.isArray(gallery) || gallery.length === 0) {
    return "";
  }

  const items = gallery
    .map(
      (item) => `
      <figure class="gallery-card">
        <img class="gallery-card__image" src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt)}">
      </figure>
    `
    )
    .join("");

  return `
    <section id="gallery" class="gallery-section section-spacing">
      <div class="site-container">
        <p class="section-eyebrow">Bilder</p>
        <h2 class="section-title">Inblick i verksamheten</h2>
        <div class="gallery-grid">${items}</div>
      </div>
    </section>
  `;
}

function renderHeroVisual(media, site, contact) {
  if (!media.heroImage) {
    return "";
  }

  return `
    <div class="hero-visual">
      <div class="hero-visual__main-card">
        <img class="hero-visual__image" src="${escapeHtml(media.heroImage.url)}" alt="${escapeHtml(media.heroImage.alt)}">
      </div>
      <div class="hero-visual__floating-card">
        <p class="hero-visual__label">Lokalt fokus</p>
        <p class="hero-visual__value">${escapeHtml(site.displayName)}</p>
        <p class="hero-visual__caption">${escapeHtml(contact.address)}</p>
      </div>
    </div>
  `;
}

function renderAboutVisual(media, usp) {
  const imageBlock = media.aboutImage
    ? `
      <div class="about-media__image-frame">
        <img class="about-media__image" src="${escapeHtml(media.aboutImage.url)}" alt="${escapeHtml(media.aboutImage.alt)}">
      </div>
    `
    : "";

  return `
    <div class="about-media">
      ${imageBlock}
      <div class="highlight-panel">
        <p class="highlight-panel__label">${escapeHtml(usp.heading)}</p>
        <ul class="usp-list">
          ${renderUsp(usp.items)}
        </ul>
      </div>
    </div>
  `;
}

function renderSiteHtml(content) {
  const template = readTemplate();
  const resolvedMedia = resolveMedia(content);
  const enriched = {
    ...content,
    media: resolvedMedia,
    og: {
      locale: localeFromLanguage(content.site.language)
    },
    contact: {
      ...content.contact,
      phoneRaw: String(content.contact.phone || "").replace(/\s+/g, "")
    },
    seo: {
      ...content.seo,
      ogImage: resolvedMedia.heroImage?.url || ""
    }
  };

  let html = template
    .replace("{{headerBrand}}", renderBrand({
      companyName: content.site.displayName,
      logoUrl: resolvedMedia.logoUrl,
      className: "brand-mark"
    }))
    .replace("{{footerBrand}}", renderBrand({
      companyName: content.footer.companyName,
      logoUrl: resolvedMedia.logoUrl,
      className: "brand-mark brand-mark--footer"
    }))
    .replace("{{galleryNavLink}}", resolvedMedia.gallery.length > 0 ? '<a class="site-navigation__link" href="#gallery">Bilder</a>' : "")
    .replace("{{servicesList}}", renderServices(content.services.items))
    .replace("{{heroVisual}}", renderHeroVisual(resolvedMedia, content.site, content.contact))
    .replace("{{aboutVisual}}", renderAboutVisual(resolvedMedia, content.usp))
    .replace("{{gallerySection}}", renderGallery(resolvedMedia.gallery))
    .replace("{{testimonialsSection}}", renderTestimonials(content.testimonials))
    .replace("{{faqSection}}", renderFaq(content.faq))
    .replace("{{socialLinks}}", renderSocialLinks(content.footer.socialLinks));

  html = html.replace(/{{\s*([\w.]+)\s*}}/g, (_, keyPath) => escapeHtml(get(enriched, keyPath)));
  return html;
}

module.exports = {
  renderSiteHtml
};
