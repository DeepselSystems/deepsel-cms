import { useMemo } from 'react';
import { parseSlugForLangAndPath } from '@deepsel/cms-utils';
import { usePageData } from '../contexts/PageDataContext';

/**
 * React hook to read and change the current language.
 *
 * - `language` is derived from `pageData.lang` or the site's default language.
 * - `setLanguage` updates the URL based on the current page and its language alternatives.
 */
export function useLanguage() {
  const { pageData } = usePageData();

  const language = useMemo(() => {
    if (pageData?.lang) {
      return pageData.lang;
    }

    return pageData?.public_settings?.default_language.iso_code ?? 'en';
  }, [pageData?.lang, pageData?.public_settings?.default_language.iso_code]);

  const availableLanguages = useMemo(
    () => pageData?.public_settings?.available_languages || [],
    [pageData?.public_settings?.available_languages],
  );

  const setLanguage = (targetLangCode: string) => {
    if (!pageData) {
      return;
    }

    // Note: With context-based approach, we just navigate to the new URL
    // The page will reload with the correct language data

    // In the browser environment, we will need to change the URL to match
    if (typeof window === 'undefined') {
      return;
    }

    // For pages: Use language_alternatives metadata to get language-specific slugs
    let targetPath: string | null = null;
    const { path: currentPath } = parseSlugForLangAndPath(window.location.pathname);

    if (pageData.language_alternatives?.length) {
      const targetAlternative = pageData.language_alternatives.find(
        (alt: any) => alt.locale?.iso_code === targetLangCode,
      );

      if (targetAlternative?.slug) {
        targetPath = targetAlternative.slug.startsWith('/')
          ? targetAlternative.slug
          : `/${targetAlternative.slug}`;
      }
    }

    // Fallback to current path if no specific content found
    if (!targetPath) {
      targetPath = currentPath;
    }

    // Build final URL
    const finalUrl =
      targetLangCode !== pageData.public_settings.default_language.iso_code
        ? `/${targetLangCode}${targetPath}`
        : targetPath;

    // Just update the URL, PageTransition will handle fetching new data
    window.history.pushState(null, '', finalUrl);
  };

  return { language, setLanguage, availableLanguages } as const;
}
