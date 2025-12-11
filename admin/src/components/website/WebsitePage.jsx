import {useState, useEffect, lazy, useMemo, Suspense} from 'react';
import {useParams, useLocation} from 'react-router-dom';
import useAuthentication from '../../common/api/useAuthentication.js';
import {useProtectedAuth} from '../../common/auth/ProtectedAuth.jsx';
import {parseSlugForLangAndPath, fetchPageData} from '../../utils/pageUtils.js';
import {useTranslation} from 'react-i18next';
import JSONPageContentRenderer from './JSONPageContentRenderer.jsx';
import SitePublicSettingsState from '../../common/stores/SitePublicSettingsState.js';
import Chatbox from '../chatbox/Chatbox.jsx';
import HydrateServerComponents from './HydrateServerComponents.jsx';
import {Helmet} from 'react-helmet';
import CustomCodeErrorBoundary from './CustomCodeErrorBoundary.jsx';
import CustomCodeRenderer from './CustomCodeRenderer.jsx';
import SpecialTemplateRenderer from './SpecialTemplateRenderer.jsx';
// Lazy load the AdminHeader component
const AdminHeader = lazy(() => import('./AdminHeader.jsx'));

export default function WebsitePage(props) {
  const {initialPageData, initialPath, isPreviewMode, parsedPreviewData} =
    props; // server passed props, will get old when client side navigates
  const {i18n} = useTranslation();
  const [page, setPage] = useState(null);
  const {user} = useAuthentication();
  const {setRequiresLogin} = useProtectedAuth();
  const location = useLocation();
  const params = useParams();
  const [lastCheckTime, setLastCheckTime] = useState(Date.now());

  const {settings: siteSettings, setSettings} = SitePublicSettingsState();

  // Get slug, handle the case where slug might be an array in React Router
  const rawSlug = useMemo(() => {
    if (Array.isArray(params.slug)) {
      return params.slug.join('/');
    }
    return params.slug || location.pathname;
  }, [params, location]);

  // Parse the slug to determine path without language component like /en/
  const {path: pathWithoutLang} = useMemo(
    () => parseSlugForLangAndPath(rawSlug),
    [rawSlug]
  );
  const [lastPath, setLastPath] = useState(location.pathname);
  const [isNewNavigation, setIsNewNavigation] = useState(false);

  const allowEdit = user?.roles.some((role) =>
    [
      'admin_role',
      'super_admin_role',
      'website_admin_role',
      'website_editor_role',
    ].includes(role.string_id)
  );

  // Fetch page data whenever path or language changes
  useEffect(() => {
    let isMounted = true;
    const newNavigation = lastPath !== location.pathname;
    setIsNewNavigation(newNavigation);
    setLastPath(location.pathname);

    // Handle preview data if available
    if (parsedPreviewData) {
      setPage(parsedPreviewData);
      return;
    }

    // Use initialPageData on first mount if path matches
    if (
      initialPageData &&
      initialPath === pathWithoutLang && // initialPath does not include lang like /en/, we need to compare paths only
      !newNavigation
    ) {
      setPage(initialPageData);
      return;
    }

    // On new navigation, fetch page data
    if (isMounted && newNavigation) {
      (async () => {
        const newPageData = await fetchPageData(
          i18n.language,
          pathWithoutLang,
          isPreviewMode
        );
        if (isMounted) {
          setPage(newPageData);
          // Check if page requires login
          if (newPageData && newPageData.require_login && !user) {
            setRequiresLogin(true);
          }
        }
      })();
    }

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [
    pathWithoutLang,
    i18n.language,
    location.pathname,
    initialPath,
    initialPageData,
    isPreviewMode,
    parsedPreviewData,
  ]);

  // Check for page updates via sessionStorage
  // If we were just at PageEdit, saved and auto-navigated back here,
  // we need to re-fetch the page data
  useEffect(() => {
    if (!page?.id || parsedPreviewData) return;

    const checkForUpdates = () => {
      const updateData = sessionStorage.getItem('pageUpdated');
      if (updateData) {
        const {pageId, timestamp} = JSON.parse(updateData);
        if (String(pageId) === String(page.id) && timestamp > lastCheckTime) {
          // Clear the signal and reload data
          sessionStorage.removeItem('pageUpdated');
          (async () => {
            const updatedPageData = await fetchPageData(
              i18n.language,
              pathWithoutLang,
              isPreviewMode
            );
            if (updatedPageData) {
              setPage(updatedPageData);
              setLastCheckTime(Date.now());
            }
          })();
        }
      }
    };

    // Check immediately and set up interval
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 1000);

    return () => clearInterval(interval);
  }, [
    page?.id,
    lastCheckTime,
    i18n.language,
    pathWithoutLang,
    isPreviewMode,
    parsedPreviewData,
  ]);

  const currentPageData = page || initialPageData;

  // Keep public settings in sync when backend returns them with page payloads
  useEffect(() => {
    if (page?.public_settings) {
      setSettings(page.public_settings);
    }
  }, [page?.public_settings, setSettings]);

  // Check if current page requires login
  useEffect(() => {
    if (currentPageData && currentPageData.require_login && !user) {
      setRequiresLogin(true);
    }
  }, [currentPageData, user, setRequiresLogin]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const clearHighlights = (root) => {
      const highlights = root.querySelectorAll('.search-highlight');
      highlights.forEach((highlight) => {
        const parentNode = highlight.parentNode;
        if (!parentNode) return;
        parentNode.replaceChild(
          document.createTextNode(highlight.textContent),
          highlight
        );
        parentNode.normalize();
      });
    };

    const container = document.querySelector('main');
    if (!container) return;

    const params = new URLSearchParams(location.search);
    const keyword = params.get('search')?.trim() || '';

    if (!keyword) {
      clearHighlights(container);
      return;
    }

    const highlightMatches = (root, term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!escaped) return null;
      const regex = new RegExp(escaped, 'gi');
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }

      let firstHighlight = null;
      textNodes.forEach((node) => {
        const parentElement = node.parentElement;
        if (
          !node.textContent ||
          (parentElement &&
            ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parentElement.tagName))
        ) {
          return;
        }
        if (parentElement?.classList?.contains('search-highlight')) {
          return;
        }

        const matches = [...node.textContent.matchAll(regex)];
        if (!matches.length) return;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        matches.forEach((match) => {
          const {index} = match;
          if (index > lastIndex) {
            fragment.appendChild(
              document.createTextNode(node.textContent.slice(lastIndex, index))
            );
          }

          const highlight = document.createElement('mark');
          highlight.className = 'search-highlight';
          highlight.textContent = node.textContent.slice(
            index,
            index + match[0].length
          );
          fragment.appendChild(highlight);

          if (!firstHighlight) {
            firstHighlight = highlight;
          }

          lastIndex = index + match[0].length;
        });

        if (lastIndex < node.textContent.length) {
          fragment.appendChild(
            document.createTextNode(node.textContent.slice(lastIndex))
          );
        }

        node.parentNode.replaceChild(fragment, node);
      });

      return firstHighlight;
    };

    let animationFrame;
    let scrollTimeout;
    animationFrame = window.requestAnimationFrame(() => {
      clearHighlights(container);
      const firstMatch = highlightMatches(container, keyword);
      if (firstMatch) {
        scrollTimeout = window.setTimeout(() => {
          firstMatch.scrollIntoView({behavior: 'smooth', block: 'center'});
        }, 400);
      }
    });

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
      if (scrollTimeout) {
        window.clearTimeout(scrollTimeout);
      }

      clearHighlights(container);
    };
  }, [location.search, page]);

  if (!page) return null;
  if (page.notFound) {
    return (
      <SpecialTemplateRenderer
        templateKey="not_found"
        siteSettingsOverride={page.public_settings}
      />
    );
  }

  return (
    <>
      {page?.title && (
        <Helmet>
          <title>
            {parsedPreviewData ? `Preview: ${page.title}` : page.title}
          </title>
          {parsedPreviewData && (
            <meta name="robots" content="noindex, nofollow" />
          )}
        </Helmet>
      )}

      {user && page?.id && !isPreviewMode && (
        <Suspense fallback={<div className="bg-gray-100 shadow-lg py-2"></div>}>
          <AdminHeader
            page={page}
            editPath={`/admin/pages/${page.id}/edit?redirect=${location.pathname}`}
            allowEdit={allowEdit}
          />
        </Suspense>
      )}

      <JSONPageContentRenderer content={page.content} />

      {/* Custom Code Injection after content */}
      <CustomCodeErrorBoundary>
        <CustomCodeRenderer
          pageData={page}
          contentData={page}
          type="page"
          isPreviewMode={isPreviewMode}
        />
      </CustomCodeErrorBoundary>

      {/* Hydrate Server React Components */}
      <HydrateServerComponents
        siteSettings={siteSettings}
        isNewNavigation={isNewNavigation}
      />

      {siteSettings?.show_chatbox && <Chatbox />}
    </>
  );
}
