const { SITE_THEMES, getSiteTheme } = require('../constants/siteThemes');
const templateSourceService = require('./templateSourceService');

async function readThemeTemplate(theme) {
  const file = await templateSourceService.getTemplateFile(theme.templatePath);
  return file.content;
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
    '<script id="initial-content" type="application/json">\n' + json + '\n    </script>'
  );
}

function replaceStylesheetPath(templateHtml, theme) {
  return templateHtml.replace(
    /<link\s+rel="stylesheet"\s+href="[^"]+"\s*\/?>/,
    `<link rel="stylesheet" href="${theme.stylesheetPath}" />`
  );
}

function replaceDocumentMeta(templateHtml, content) {
  const seoTitle = escapeHtml(content.seo?.title || content.site?.displayName || '');
  const seoDescription = escapeHtml(content.seo?.description || '');
  const ogImage = escapeHtml(content.media?.heroImage?.url || '');
  const locale = escapeHtml(localeFromLanguage(content.site?.language));
  const language = escapeHtml(content.site?.language || 'sv');

  return templateHtml
    .replace(/<html lang="[^"]*"[^>]*>/, (match) => match.replace(/lang="[^"]*"/, 'lang="' + language + '"'))
    .replace(/<title>[\s\S]*?<\/title>/, '<title>' + seoTitle + '</title>')
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, '<meta name="description" content="' + seoDescription + '" />')
    .replace(/<meta property="og:locale" content="[^"]*"\s*\/>/, '<meta property="og:locale" content="' + locale + '" />')
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, '<meta property="og:title" content="' + seoTitle + '" />')
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, '<meta property="og:description" content="' + seoDescription + '" />')
    .replace(/<meta property="og:image" content="[^"]*"\s*\/>/, '<meta property="og:image" content="' + ogImage + '" />')
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, '<meta name="twitter:title" content="' + seoTitle + '" />')
    .replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/, '<meta name="twitter:description" content="' + seoDescription + '" />')
    .replace(/<meta name="twitter:image" content="[^"]*"\s*\/>/, '<meta name="twitter:image" content="' + ogImage + '" />');
}

async function renderSiteHtml(content) {
  const theme = getSiteTheme(content.site?.theme);
  const template = await readThemeTemplate(theme);
  const htmlWithStylesheet = replaceStylesheetPath(template, theme);
  const htmlWithMeta = replaceDocumentMeta(htmlWithStylesheet, content);
  return replaceInitialContent(htmlWithMeta, content);
}

async function getSharedTemplateFiles() {
  const paths = ['index.js', 'main.css', ...Object.values(SITE_THEMES).map((theme) => theme.stylesheetPath)];
  const templateFiles = await templateSourceService.getTemplateFiles(paths);

  const files = [
    {
      path: 'index.js',
      content: templateFiles['index.js']
    },
    {
      path: 'main.css',
      content: templateFiles['main.css']
    }
  ];

  for (const theme of Object.values(SITE_THEMES)) {
    files.push({
      path: theme.stylesheetPath,
      content: templateFiles[theme.stylesheetPath]
    });
  }

  return files;
}

module.exports = {
  renderSiteHtml,
  getSharedTemplateFiles
};
