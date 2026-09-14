const { normalizeSiteTheme, normalizeSiteThemeMode } = require('../constants/siteThemes');

const PRIMARY_CTA_LABELS = {
  quote: 'Beg?r offert',
  call: 'Ring oss',
  consultation: 'Boka konsultation',
  contact: 'Kontakta oss'
};

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function asStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => {
      if (typeof value === 'string') {
        return value.trim();
      }

      if (value && typeof value === 'object') {
        return firstNonEmpty(value.title, value.label, value.text, value.description, value.name);
      }

      return '';
    })
    .filter(Boolean);
}

function asObjectArray(values) {
  return Array.isArray(values) ? values.filter((value) => value && typeof value === 'object') : [];
}

function socialLinksArrayToObject(values) {
  if (!Array.isArray(values)) {
    return {};
  }

  return values.reduce((acc, item) => {
    if (!item || typeof item !== 'object') {
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

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const normalized = Object.entries(value).reduce((acc, [key, url]) => {
      if (typeof url === 'string' && url.trim()) {
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
    [contact?.address, contact?.postalCode, contact?.city].filter(Boolean).join(', '),
    [input.address, input.postalCode, input.city].filter(Boolean).join(', ')
  );
}

function normalizeServiceItems(services, input) {
  const items = asObjectArray(services?.items).map((item) => ({
    title: firstNonEmpty(item.title, item.name, item.headline),
    description: firstNonEmpty(item.description, item.text, item.body),
    image: createMediaItem(
      firstNonEmpty(item.image?.url, item.imageUrl, item.image?.src, item.src),
      firstNonEmpty(item.image?.alt, item.imageAlt, item.alt, item.caption)
    )
  }));

  if (items.length > 0) {
    return items;
  }

  return (input.services || [])
    .map((service) => ({
      title: firstNonEmpty(service),
      description: '',
      image: createMediaItem('', '')
    }))
    .filter((item) => item.title || item.description);
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

function buildGallery(rawMediaGallery, uploadedAssets) {
  const rawItems = asObjectArray(rawMediaGallery)
    .map((item) => {
      const url = firstNonEmpty(item.url, item.src);
      const alt = firstNonEmpty(item.alt, item.caption);
      return url ? createMediaItem(url, alt) : null;
    })
    .filter(Boolean)
    .filter((item) => item.url);

  if (rawItems.length > 0) {
    return rawItems;
  }

  return [...(uploadedAssets.userImages || []), ...(uploadedAssets.aiImages || []).map((item) => item.url)]
    .filter(Boolean)
    .map((url) => createMediaItem(url, ''));
}

function selectAiImage(uploadedAssets, slot) {
  return (uploadedAssets.aiImages || []).find((item) => item.slot === slot)?.url || '';
}

function normalizePrimaryCtaLabel(rawValue, inputValue) {
  return firstNonEmpty(rawValue, PRIMARY_CTA_LABELS[inputValue] || inputValue);
}

function normalizeHomeContent(rawContent, { siteId, input, uploadedAssets = {} }) {
  const raw = rawContent && typeof rawContent === 'object' ? rawContent : {};
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

  const rawHeroImageUrl = firstNonEmpty(media.heroImage?.url, media.heroImageUrl);
  const rawAboutImageUrl = firstNonEmpty(media.aboutImage?.url, media.aboutImageUrl);
  const firstUserImage = uploadedAssets.userImages?.[0] || '';
  const secondUserImage = uploadedAssets.userImages?.[1] || uploadedAssets.userImages?.[0] || '';
  const heroImageUrl = firstNonEmpty(rawHeroImageUrl, firstUserImage, selectAiImage(uploadedAssets, 'hero'), secondUserImage);
  const aboutImageUrl = firstNonEmpty(rawAboutImageUrl, secondUserImage, selectAiImage(uploadedAssets, 'about'), firstUserImage, heroImageUrl);
  const gallery = buildGallery(media.gallery, uploadedAssets);
  const normalizedDisplayName = firstNonEmpty(site.displayName, input.displayName, site.companyName, input.companyName);
  const normalizedCompanyName = firstNonEmpty(site.companyName, input.companyName, normalizedDisplayName);

  return {
    site: {
      siteId,
      companyName: normalizedCompanyName,
      displayName: normalizedDisplayName,
      language: firstNonEmpty(site.language, input.language),
      primaryColor: firstNonEmpty(site.primaryColor, input.primaryColor),
      secondaryColor: firstNonEmpty(site.secondaryColor, input.secondaryColor),
      headingFont: firstNonEmpty(site.headingFont) || 'Georgia, "Times New Roman", serif',
      bodyFont: firstNonEmpty(site.bodyFont) || 'Arial, sans-serif',
      headerBackgroundColor: firstNonEmpty(site.headerBackgroundColor),
      mainBackgroundColor: firstNonEmpty(site.mainBackgroundColor),
      footerBackgroundColor: firstNonEmpty(site.footerBackgroundColor),
      theme: normalizeSiteTheme(firstNonEmpty(site.theme, input.theme)),
      themeMode: normalizeSiteThemeMode(firstNonEmpty(site.themeMode, input.visualStyle))
    },
    seo: {
      title: firstNonEmpty(seo.title, seo.ogTitle),
      description: firstNonEmpty(seo.description, seo.ogDescription),
      keywords: asStringArray(seo.keywords)
    },
    hero: {
      enabled: typeof hero.enabled === 'boolean' ? hero.enabled : true,
      eyebrow: firstNonEmpty(hero.eyebrow, hero.backgroundText),
      headline: firstNonEmpty(hero.headline),
      subheadline: firstNonEmpty(hero.subheadline, hero.text),
      primaryCtaLabel: normalizePrimaryCtaLabel(firstNonEmpty(hero.primaryCtaLabel, hero.primaryCtaText), input.primaryCta),
      primaryCtaHref: '#kontakt'
    },
    intro: {
      enabled: typeof intro.enabled === 'boolean' ? intro.enabled : true,
      eyebrow: firstNonEmpty(intro.eyebrow) || 'Introduktion',
      heading: firstNonEmpty(intro.heading, intro.headline),
      body: firstNonEmpty(intro.body, intro.text)
    },
    services: {
      enabled: typeof services.enabled === 'boolean' ? services.enabled : true,
      eyebrow: firstNonEmpty(services.eyebrow) || 'Tjänster',
      heading: firstNonEmpty(services.heading, services.headline),
      items: normalizeServiceItems(services, input)
    },
    about: {
      enabled: typeof about.enabled === 'boolean' ? about.enabled : true,
      eyebrow: firstNonEmpty(about.eyebrow) || 'Om oss',
      heading: firstNonEmpty(about.heading, about.headline),
      body: firstNonEmpty(about.body, about.text)
    },
    usp: {
      enabled: typeof usp.enabled === 'boolean' ? usp.enabled : true,
      eyebrow: firstNonEmpty(usp.eyebrow) || 'Varför välja oss',
      heading: firstNonEmpty(usp.heading, usp.headline),
      items: asStringArray(usp.items).length > 0 ? asStringArray(usp.items) : asStringArray(input.usp)
    },
    testimonials: {
      eyebrow: firstNonEmpty(testimonials.eyebrow) || 'Omdömen',
      heading: firstNonEmpty(testimonials.heading, testimonials.headline),
      enabled: typeof testimonials.enabled === 'boolean' ? testimonials.enabled : input.showTestimonials,
      items: normalizeTestimonialItems(testimonials)
    },
    faq: {
      eyebrow: firstNonEmpty(faq.eyebrow) || 'FAQ',
      heading: firstNonEmpty(faq.heading, faq.headline),
      enabled: typeof faq.enabled === 'boolean' ? faq.enabled : input.showFaq,
      items: normalizeFaqItems(faq)
    },
    contact: {
      enabled: typeof contact.enabled === 'boolean' ? contact.enabled : true,
      eyebrow: firstNonEmpty(contact.eyebrow) || 'Kontakt',
      heading: firstNonEmpty(contact.heading, contact.headline),
      body: firstNonEmpty(contact.body, contact.text),
      email: firstNonEmpty(contact.email, input.websiteEmail),
      phone: firstNonEmpty(contact.phone, contact.mobile, input.websitePhone),
      address: buildAddress(contact, input)
    },
    footer: {
      enabled: typeof footer.enabled === 'boolean' ? footer.enabled : true,
      companyName: firstNonEmpty(footer.companyName, normalizedDisplayName, normalizedCompanyName),
      tagline: firstNonEmpty(footer.tagline, footer.text),
      copyright: firstNonEmpty(footer.copyright),
      socialLinks: normalizeSocialLinks(footer.socialLinks, input.socialLinks)
    },
    media: {
      logoUrl: firstNonEmpty(media.logoUrl, uploadedAssets.logoUrl) || null,
      headerLogoOnly: typeof media.headerLogoOnly === 'boolean' ? media.headerLogoOnly : false,
      logoWidth: firstNonEmpty(media.logoWidth) || '42px',
      imageRatio: firstNonEmpty(media.imageRatio) || '4 / 3',
      heroImage: createMediaItem(heroImageUrl, firstNonEmpty(media.heroImage?.alt)),
      aboutImage: createMediaItem(aboutImageUrl, firstNonEmpty(media.aboutImage?.alt)),
      galleryEnabled: typeof media.galleryEnabled === 'boolean' ? media.galleryEnabled : true,
      galleryEyebrow: firstNonEmpty(media.galleryEyebrow) || 'Bilder',
      galleryHeading: firstNonEmpty(media.galleryHeading),
      gallery
    }
  };
}

module.exports = {
  normalizeHomeContent
};
