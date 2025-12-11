import { useEffect } from 'react';
import { usePageData } from '../contexts/PageDataContext';
import { fetchPageData, parseSlugForLangAndPath } from '@deepsel/cms-utils';

interface PageTransitionProps {
  onPathChange?: (path: string) => void;
  onNavigate?: (url: string, event: MouseEvent) => void;
}

export function PageTransition({ onPathChange, onNavigate }: PageTransitionProps) {
  // Initialize the page data store
  const { pageData, setPageData } = usePageData();

  // Client-side navigation function
  const navigateToUrl = async (url: string) => {
    try {
      const { lang, path } = parseSlugForLangAndPath(url);
      const newPageData = await fetchPageData(lang, path);

      if ('error' in newPageData || 'notFound' in newPageData) {
        window.location.href = url;
        return;
      }

      window.history.pushState(null, '', url);
      setPageData(newPageData);
      // onPathChange?.(window.location.pathname);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  useEffect(() => {
    // Update document title and meta tags when page data changes
    if (!pageData) return;

    // Update title
    if (pageData.seo_metadata?.title && typeof pageData.seo_metadata?.title === 'string') {
      document.title = pageData.seo_metadata.title;
    }

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    const metaDescriptionContent = pageData.seo_metadata?.description;
    if (metaDescription && typeof metaDescriptionContent === 'string') {
      metaDescription.setAttribute('content', metaDescriptionContent);
    }

    // Update robots meta tag
    const metaRobots = document.querySelector('meta[name="robots"]');
    if (metaRobots && typeof pageData.seo_metadata?.allow_indexing === 'boolean') {
      const robotsContent = pageData.seo_metadata?.allow_indexing
        ? 'index, follow'
        : 'noindex, nofollow';
      metaRobots.setAttribute('content', robotsContent);
    }

    // Update html lang attribute
    if (pageData.lang) {
      document.documentElement.lang = pageData.lang;
    }
  }, [pageData]);

  useEffect(() => {
    // Watch for URL path changes (browser back/forward)
    const handlePathChange = async () => {
      const currentPath = window.location.pathname;

      try {
        const { lang, path } = parseSlugForLangAndPath(currentPath);
        const newPageData = await fetchPageData(lang, path);

        if (!('error' in newPageData) && !('notFound' in newPageData)) {
          setPageData(newPageData);
        }
      } catch (error) {
        console.error('Error fetching page data on path change:', error);
      }

      onPathChange?.(currentPath);
    };

    const handlePathChangeListener = () => {
      void handlePathChange();
    };

    window.addEventListener('popstate', handlePathChangeListener);

    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = function (...args) {
      originalPushState(...args);
      void handlePathChange();
    };

    history.replaceState = function (...args) {
      originalReplaceState(...args);
      void handlePathChange();
    };

    return () => {
      window.removeEventListener('popstate', handlePathChangeListener);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [setPageData]);

  useEffect(() => {
    // Intercept all <a> tag clicks for client-side navigation
    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');

      if (!link) return;

      const href = link.getAttribute('href');

      // Skip if no href or it's an external link
      if (
        !href ||
        href.startsWith('http') ||
        href.startsWith('//') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      ) {
        return;
      }

      // Skip if it has target="_blank" or similar
      if (link.target && link.target !== '_self') {
        return;
      }

      // Skip if it's a hash link on the same page
      if (href.startsWith('#')) {
        return;
      }

      // Skip if modifier keys are pressed (allow opening in new tab)
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return;
      }

      // Skip if it has download attribute
      if (link.hasAttribute('download')) {
        return;
      }

      // Prevent default navigation and stop propagation
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      // Handle the navigation
      if (onNavigate) {
        onNavigate(href, event);
      } else {
        void navigateToUrl(href);
      }
    };

    // Add click listener to document with capture phase to intercept early
    document.addEventListener('click', handleLinkClick, true);

    return () => {
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [onNavigate, onPathChange, navigateToUrl]);

  return null;
}
