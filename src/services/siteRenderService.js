const fs = require('fs');
const path = require('path');
const { SITE_THEMES, getSiteTheme } = require('../constants/siteThemes');

const templateRoot = path.resolve(__dirname, '..', '..', '..', 'template--content-creator');

function readTemplateFile(relativePath) {
  return fs.readFileSync(path.join(templateRoot, relativePath), 'utf8');
}

function readThemeTemplate(themeId) {
  const theme = getSiteTheme(themeId);
  return readTemplateFile(theme.templatePath);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function localeFromLanguage(language) {
  return language === 'sv' ? 'sv_SE' : 'en_US';
}

function escapeInlineScriptJson(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, '\u003c')
    .replace(/>/g, '\u003e')
    .replace(/&/g, '\u0026');
}

function replaceInitialContent(templateHtml, content) {
  const json = escapeInlineScriptJson(content);
  return templateHtml.replace(
    /<script id="initial-content" type="application\/json">[\s\S]*?<\/script>/,
    `<script id="initial-content" type="application/json">\n${json}\n    </script>`
  );
}

function replaceDocumentMeta(templateHtml, content) {
  const seoTitle = escapeHtml(content.seo?.title || content.site?.displayName || '');
  const seoDescription = escapeHtml(content.seo?.description || '');
  const ogImage = escapeHtml(content.media?.heroImage?.url || '');
  const locale = escapeHtml(localeFromLanguage(content.site?.language));
  const language = escapeHtml(content.site?.language || 'sv');

  return templateHtml
    .replace(/<html lang="[^"]*">/, `<html lang="${language}">`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${seoTitle}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${seoDescription}" />`)
    .replace(/<meta property="og:locale" content="[^"]*"\s*\/>/, `<meta property="og:locale" content="${locale}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${seoTitle}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${seoDescription}" />`)
    .replace(/<meta property="og:image" content="[^"]*"\s*\/>/, `<meta property="og:image" content="${ogImage}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${seoTitle}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${seoDescription}" />`)
    .replace(/<meta name="twitter:image" content="[^"]*"\s*\/>/, `<meta name="twitter:image" content="${ogImage}" />`);
}

function renderSiteHtml(content) {
  const template = readThemeTemplate(content.site?.theme);
  const htmlWithMeta = replaceDocumentMeta(template, content);
  return replaceInitialContent(htmlWithMeta, content);
}

function getSharedTemplateFiles() {
  const files = [
    {
      path: 'index.js',
      content: readTemplateFile('index.js')
    },
    {
      path: 'main.css',
      content: readTemplateFile('main.css')
    }
  ];

  for (const theme of Object.values(SITE_THEMES)) {
    files.push({
      path: theme.stylesheetPath,
      content: readTemplateFile(theme.stylesheetPath)
    });
  }

  return files;
}

module.exports = {
  renderSiteHtml,
  getSharedTemplateFiles
};