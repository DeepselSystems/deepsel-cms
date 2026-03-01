import { themeMap, themeSystemKeys, type ThemeName } from '../themes';
import type { PageData, BlogListData, BlogPostData, SearchResultsData } from '@deepsel/cms-utils';

function getSelectedThemeSettings(data: PageData | BlogListData | BlogPostData | SearchResultsData) {
  const publicSettings = data.public_settings;
  const selectedTheme: ThemeName = publicSettings?.selected_theme as ThemeName;
  const defaultLangIsoCode = publicSettings?.default_language?.iso_code;
  return { selectedTheme, defaultLangIsoCode };
}

export function getPageThemeComponent(data: PageData, lang?: string): any {
  let ThemeComponent: any;

  const { selectedTheme, defaultLangIsoCode } = getSelectedThemeSettings(data);
  const pageSlug = data.slug?.replace(/^\//, '').toLowerCase() || 'index'; // index.astro is the fallback for every theme
  const isNonDefaultLang = lang && defaultLangIsoCode && lang !== defaultLangIsoCode;
  const langPrefix = isNonDefaultLang ? `${lang}:` : '';

  if (data.notFound) {
    // For notFound, use the 404 template. component key will be "en:404" or just "404"
    ThemeComponent =
      themeMap[selectedTheme][`${langPrefix}${themeSystemKeys.NotFound}`] ||
      themeMap[selectedTheme][themeSystemKeys.NotFound];
  } else {
    // For other pages, try match the page slug. component key will be eg. "en:about" or just "about"
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
