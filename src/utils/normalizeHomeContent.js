const { normalizeSiteTheme, normalizeSiteThemeMode } = require('../constants/siteThemes');
function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function asStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => {
      if (typeof value === "string") {
        return value.trim();
      }

      if (value && typeof value === "object") {
        return firstNonEmpty(value.title, value.label, value.text, value.description, value.name);
      }

      return "";
    })
    .filter(Boolean);
}

function asObjectArray(values) {
  return Array.isArray(values) ? values.filter((value) => value && typeof value === "object") : [];
}

function socialLinksArrayToObject(values) {
  if (!Array.isArray(values)) {
    return {};
  }

  return values.reduce((acc, item) => {
    if (!item || typeof item !== "object") {
      return acc;
    }

    const key = firstNonEmpty(item.platform).toLowerCase();
    const url = firstNonEmpty(item.url);

    if (key && url) {
      acc[key] = url;
    }

    return acc;
  }, {});
}

function normalizeSocialLinks(value, inputSocialLinks) {
  if (Array.isArray(value)) {
    const normalized = socialLinksArrayToObject(value);
    if (Object.keys(normalized).length > 0) {
      return normalized;
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const normalized = Object.entries(value).reduce((acc, [key, url]) => {
      if (typeof url === "string" && url.trim()) {
        acc[key] = url.trim();
      }
      return acc;
    }, {});

    if (Object.keys(normalized).length > 0) {
      return normalized;
    }
  }

  return socialLinksArrayToObject(inputSocialLinks);
}

function buildAddress(contact, input) {
  return firstNonEmpty(
    contact?.address,
    [contact?.address, contact?.postalCode, contact?.city].filter(Boolean).join(", "),
    [input.address, input.postalCode, input.city].filter(Boolean).join(", ")
  );
}

function normalizeServiceItems(services, input) {
  const items = asObjectArray(services?.items).map((item) => ({
    title: firstNonEmpty(item.title, item.name, item.headline),
    description: firstNonEmpty(item.description, item.text, item.body)
  }));

  if (items.length > 0) {
    return items;
  }

  return (input.services || []).map((service) => ({
    title: service,
    description: `${input.displayName} erbjuder ${service.toLowerCase()} i ${input.serviceArea}.`
  }));
}

function normalizeFaqItems(faq) {
  return asObjectArray(faq?.items).map((item) => ({
    question: firstNonEmpty(item.question, item.title, item.headline),
    answer: firstNonEmpty(item.answer, item.text, item.body)
  }));
}

function normalizeTestimonialItems(testimonials) {
  return asObjectArray(testimonials?.items).map((item) => ({
    name: firstNonEmpty(item.name, item.author, item.company),
    quote: firstNonEmpty(item.quote, item.text, item.body)
  }));
}

function createMediaItem(url, alt) {
  return {
    url,
    alt
  };
}

function buildGallery(rawMediaGallery, uploadedAssets, input) {
  const rawItems = asObjectArray(rawMediaGallery)
    .map((item) => {
      const url = firstNonEmpty(item.url, item.src);
      const alt = firstNonEmpty(item.alt, item.caption, `${input.displayName} i arbete`);
      return url ? createMediaItem(url, alt) : null;
    })
    .filter(Boolean)
    .filter((item) => item.url);

  if (rawItems.length > 0) {
    return rawItems;
  }

  return [...(uploadedAssets.userImages || []), ...(uploadedAssets.aiImages || []).map((item) => item.url)]
    .filter(Boolean)
    .map((url, index) => createMediaItem(url, `${input.displayName} bild ${index + 1}`));
}

function selectAiImage(uploadedAssets, slot) {
  return (uploadedAssets.aiImages || []).find((item) => item.slot === slot)?.url || "";
}

function normalizeHomeContent(rawContent, { siteId, input, uploadedAssets = {} }) {
  const raw = rawContent && typeof rawContent === "object" ? rawContent : {};
  const site = raw.site || {};
  const seo = raw.seo || {};
  const hero = raw.hero || {};
  const intro = raw.intro || {};
  const services = raw.services || {};
  const about = raw.about || {};
  const usp = raw.usp || {};
  const testimonials = raw.testimonials || {};
  const faq = raw.faq || {};
  const contact = raw.contact || {};
  const footer = raw.footer || {};
  const media = raw.media || {};

  const aboutPoints = asStringArray(about.points);
  const aboutCertifications = asStringArray(about.certifications);
  const uspItems = asStringArray(usp.items);

  const rawHeroImageUrl = firstNonEmpty(media.heroImage?.url, media.heroImageUrl);
  const rawAboutImageUrl = firstNonEmpty(media.aboutImage?.url, media.aboutImageUrl);
  const firstUserImage = uploadedAssets.userImages?.[0] || "";
  const secondUserImage = uploadedAssets.userImages?.[1] || uploadedAssets.userImages?.[0] || "";
  const heroImageUrl = firstNonEmpty(rawHeroImageUrl, firstUserImage, selectAiImage(uploadedAssets, "hero"), secondUserImage);
  const aboutImageUrl = firstNonEmpty(rawAboutImageUrl, secondUserImage, selectAiImage(uploadedAssets, "about"), firstUserImage, heroImageUrl);
  const gallery = buildGallery(media.gallery, uploadedAssets, input);

  return {
    site: {
      siteId,
      companyName: firstNonEmpty(site.companyName, input.companyName),
      displayName: firstNonEmpty(site.displayName, input.displayName),
      language: firstNonEmpty(site.language, input.language),
      primaryColor: firstNonEmpty(site.primaryColor, input.primaryColor),
      secondaryColor: firstNonEmpty(site.secondaryColor, input.secondaryColor),
      theme: normalizeSiteTheme(site.theme),
      themeMode: normalizeSiteThemeMode(site.themeMode)
    },
    seo: {
      title: firstNonEmpty(seo.title, seo.ogTitle, `${input.displayName} | ${input.industry} i ${input.city}`),
      description: firstNonEmpty(seo.description, seo.ogDescription, input.businessDescription),
      keywords: asStringArray(seo.keywords)
    },
    hero: {
      eyebrow: firstNonEmpty(hero.eyebrow, hero.backgroundText, `${input.industry} i ${input.serviceArea}`),
      headline: firstNonEmpty(hero.headline, `${input.displayName} hjÃ¤lper ${input.targetAudience}`),
      subheadline: firstNonEmpty(hero.subheadline, hero.text, input.businessDescription),
      primaryCtaLabel: firstNonEmpty(hero.primaryCtaLabel, hero.primaryCtaText, input.primaryCta),
      primaryCtaHref: "#kontakt"
    },
    intro: {
      heading: firstNonEmpty(intro.heading, intro.headline, `Trygg hjÃ¤lp for ${input.targetAudience}`),
      body: firstNonEmpty(intro.body, intro.text, input.businessDescription)
    },
    services: {
      heading: firstNonEmpty(services.heading, services.headline, "TjÃ¤nster"),
      items: normalizeServiceItems(services, input)
    },
    about: {
      heading: firstNonEmpty(about.heading, about.headline, `Om ${input.displayName}`),
      body: firstNonEmpty(
        about.body,
        about.text,
        [...aboutPoints, ...aboutCertifications].join(" "),
        input.businessDescription
      )
    },
    usp: {
      heading: firstNonEmpty(usp.heading, usp.headline, "DÃ¤rfÃ¶r vÃ¤ljer kunder oss"),
      items: uspItems.length > 0 ? uspItems : input.usp
    },
    testimonials: {
      heading: firstNonEmpty(testimonials.heading, testimonials.headline, "Vad kunder sÃ¤ger"),
      enabled: typeof testimonials.enabled === "boolean" ? testimonials.enabled : input.showTestimonials,
      items: normalizeTestimonialItems(testimonials)
    },
    faq: {
      heading: firstNonEmpty(faq.heading, faq.headline, "Vanliga frÃ¥gor"),
      enabled: typeof faq.enabled === "boolean" ? faq.enabled : input.showFaq,
      items: normalizeFaqItems(faq)
    },
    contact: {
      heading: firstNonEmpty(contact.heading, contact.headline, "Kontakta oss"),
      body: firstNonEmpty(
        contact.body,
        contact.text,
        `HÃ¶r av dig till ${input.contactPerson} pÃ¥ ${input.websiteEmail || input.email} eller ${input.websitePhone || input.phone}.`
      ),
      email: firstNonEmpty(contact.email, input.websiteEmail),
      phone: firstNonEmpty(contact.phone, contact.mobile, input.websitePhone),
      address: buildAddress(contact, input)
    },
    footer: {
      companyName: firstNonEmpty(footer.companyName, input.displayName),
      tagline: firstNonEmpty(footer.tagline, footer.text, input.businessDescription),
      copyright: firstNonEmpty(footer.copyright, `Â© ${new Date().getFullYear()} ${input.displayName}`),
      socialLinks: normalizeSocialLinks(footer.socialLinks, input.socialLinks)
    },
    media: {
      logoUrl: firstNonEmpty(media.logoUrl, uploadedAssets.logoUrl) || null,
      heroImage: createMediaItem(
        heroImageUrl,
        firstNonEmpty(media.heroImage?.alt, `${input.displayName} hero-bild`)
      ),
      aboutImage: createMediaItem(
        aboutImageUrl,
        firstNonEmpty(media.aboutImage?.alt, `${input.displayName} verksamhetsbild`)
      ),
      galleryHeading: firstNonEmpty(media.galleryHeading, "Inblick i verksamheten"),
      gallery
    }
  };
}

module.exports = {
  normalizeHomeContent
};
