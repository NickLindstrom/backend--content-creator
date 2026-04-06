const SITE_THEMES = Object.freeze({
  classic: {
    id: 'classic',
    label: 'Klassisk',
    templatePath: 'themes/classic/template.html',
    stylesheetPath: 'themes/classic/main.css'
  },
  editorial: {
    id: 'editorial',
    label: 'Editorial',
    templatePath: 'themes/editorial/template.html',
    stylesheetPath: 'themes/editorial/main.css'
  },
  showcase: {
    id: 'showcase',
    label: 'Showcase',
    templatePath: 'themes/showcase/template.html',
    stylesheetPath: 'themes/showcase/main.css'
  }
});

const SITE_THEME_IDS = Object.freeze(Object.keys(SITE_THEMES));
const DEFAULT_SITE_THEME = 'classic';
const SITE_THEME_MODE_IDS = Object.freeze(['light', 'dark']);
const DEFAULT_SITE_THEME_MODE = 'light';

function normalizeSiteTheme(value) {
  return SITE_THEMES[value] ? value : DEFAULT_SITE_THEME;
}

function getSiteTheme(value) {
  return SITE_THEMES[normalizeSiteTheme(value)];
}

function normalizeSiteThemeMode(value) {
  return SITE_THEME_MODE_IDS.includes(value) ? value : DEFAULT_SITE_THEME_MODE;
}

module.exports = {
  SITE_THEMES,
  SITE_THEME_IDS,
  DEFAULT_SITE_THEME,
  SITE_THEME_MODE_IDS,
  DEFAULT_SITE_THEME_MODE,
  normalizeSiteTheme,
  normalizeSiteThemeMode,
  getSiteTheme
};