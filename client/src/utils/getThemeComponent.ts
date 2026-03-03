import { themeMap, themeSystemKeys, type ThemeName } from '../themes';
import type { PageData, BlogListData, BlogPostData, SearchResultsData, SiteSettings } from '@deepsel/cms-utils';

const systemKeys = new Set(Object.values(themeSystemKeys));

function getSelectedThemeSettings(data: PageData | BlogListData | BlogPostData | SearchResultsData) {
  const publicSettings = data.public_settings;
  const selectedTheme: ThemeName = publicSettings?.selected_theme as ThemeName;
  const defaultLangIsoCode = publicSettings?.default_language?.iso_code;
  return { selectedTheme, defaultLangIsoCode };
}

/**
 * Quick check: does ANY theme have a custom client component for this slug?
 * Used to decide whether to skip the backend fetch entirely.
 */
export function isAnyThemeClientPage(slug: string): boolean {
  const normalizedSlug = slug.replace(/^\//, '').toLowerCase() || '';
  if (!normalizedSlug || systemKeys.has(normalizedSlug)) return false;
  for (const themeName of Object.keys(themeMap) as ThemeName[]) {
    const component = themeMap[themeName]?.[normalizedSlug];
    if (component && component !== themeMap[themeName]['index']) return true;
  }
  return false;
}

/**
 * Check if a slug has a client-only theme component (not a system key like index/blog/404).
 * Returns the component if found, null otherwise.
 */
export function getClientPageTheme(slug: string, selectedTheme: ThemeName): any {
  const normalizedSlug = slug.replace(/^\//, '').toLowerCase() || '';
  if (!normalizedSlug || systemKeys.has(normalizedSlug)) return null;
  const component = themeMap[selectedTheme]?.[normalizedSlug];
  if (component && component !== themeMap[selectedTheme]['index']) return component;
  return null;
}

/**
 * Build minimal PageData for a client-only page (no backend fetch needed).
 * Generates a title from the slug for SEO metadata.
 */
export function buildClientPageData(slug: string, publicSettings: SiteSettings): PageData {
  const normalizedSlug = slug.replace(/^\//, '');
  const title = normalizedSlug
    ? normalizedSlug.charAt(0).toUpperCase() + normalizedSlug.slice(1).replace(/-/g, ' ')
    : '';

  return {
    slug: `/${normalizedSlug}`,
    public_settings: publicSettings,
    seo_metadata: {
      title: title || undefined,
    },
  } as PageData;
}

export function getPageThemeComponent(data: PageData, lang?: string): any {
  let ThemeComponent: any;

  const { selectedTheme, defaultLangIsoCode } = getSelectedThemeSettings(data);
  const pageSlug = data.slug?.replace(/^\//, '').toLowerCase() || 'index';
  const isNonDefaultLang = lang && defaultLangIsoCode && lang !== defaultLangIsoCode;
  const langPrefix = isNonDefaultLang ? `${lang}:` : '';

  if (data.notFound) {
    // For notFound, use the 404 template
    ThemeComponent =
      themeMap[selectedTheme][`${langPrefix}${themeSystemKeys.NotFound}`] ||
      themeMap[selectedTheme][themeSystemKeys.NotFound];
  } else {
    // For other pages, try match the page slug
    ThemeComponent =
      themeMap[selectedTheme][`${langPrefix}${pageSlug}`] ||
      themeMap[selectedTheme][pageSlug] ||
      themeMap[selectedTheme]['index'];
  }

  return ThemeComponent;
}

export function getBlogListThemeComponent(data: BlogListData, lang?: string): any {
  const { selectedTheme, defaultLangIsoCode } = getSelectedThemeSettings(data);
  const isNonDefaultLang = lang && defaultLangIsoCode && lang !== defaultLangIsoCode;
  const langPrefix = isNonDefaultLang ? `${lang}:` : '';

  // component key will be eg. "en:blog" or just "blog"
  return (
    themeMap[selectedTheme][`${langPrefix}${themeSystemKeys.BlogList}`] ||
    themeMap[selectedTheme][themeSystemKeys.BlogList]
  );
}

export function getBlogPostThemeComponent(data: BlogPostData, lang?: string): any {
  const { selectedTheme, defaultLangIsoCode } = getSelectedThemeSettings(data);
  const isNonDefaultLang = lang && defaultLangIsoCode && lang !== defaultLangIsoCode;
  const langPrefix = isNonDefaultLang ? `${lang}:` : '';

  // component key will be eg. "en:single-blog" or just "single-blog"
  return (
    themeMap[selectedTheme][`${langPrefix}${themeSystemKeys.BlogPost}`] ||
    themeMap[selectedTheme][themeSystemKeys.BlogPost]
  );
}

export function getSearchThemeComponent(data: SearchResultsData, lang?: string): any {
  const { selectedTheme, defaultLangIsoCode } = getSelectedThemeSettings(data);
  const isNonDefaultLang = lang && defaultLangIsoCode && lang !== defaultLangIsoCode;
  const langPrefix = isNonDefaultLang ? `${lang}:` : '';

  // component key will be eg. "en:search" or just "search"
  return (
    themeMap[selectedTheme][`${langPrefix}${themeSystemKeys.SearchResults}`] ||
    themeMap[selectedTheme][themeSystemKeys.SearchResults]
  );
}
