import {Suspense, lazy, useState, useEffect} from 'react';
import {useSearchParams, useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import WebsiteHeader from '../WebsiteHeader.jsx';
import WebsiteFooter from '../WebsiteFooter.jsx';
import useAuthentication from '../../../common/api/useAuthentication.js';
import SitePublicSettingsState from '../../../common/stores/SitePublicSettingsState.js';
import BackendHostURLState from '../../../common/stores/BackendHostURLState.js';
import {fetchPublicSettings} from '../../../utils/pageUtils.js';
import {QueryParamKey} from '../../../constants/queryParams.js';
import CustomCodeRenderer from '../CustomCodeRenderer.jsx';
import CustomCodeErrorBoundary from '../CustomCodeErrorBoundary.jsx';

const AdminHeader = lazy(() => import('../AdminHeader.jsx'));

export default function SearchResultPage(props) {
  const {initialPageData, isPreviewMode, siteSettings} = props;
  const {user} = useAuthentication();
  const [searchParams] = useSearchParams();
  const params = useParams();
  const {i18n} = useTranslation();
  const {settings, setSettings} = SitePublicSettingsState();
  const {backendHost} = BackendHostURLState();

  // State for search results
  const [searchResults, setSearchResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize site settings if not already loaded (for direct page refresh)
  useEffect(() => {
    const initializeSettings = async () => {
      if (siteSettings && !settings) {
        setSettings(siteSettings);
      } else if (!siteSettings && !settings) {
        try {
          const fetchedSettings = await fetchPublicSettings();
          if (fetchedSettings) {
            setSettings(fetchedSettings);
          }
        } catch (error) {
          console.error('Failed to fetch public settings:', error);
        }
      }
    };

    initializeSettings();
  }, [siteSettings, settings, setSettings]);

  const searchQuery = searchParams.get(QueryParamKey.SearchQuery) || '';
  const buildResultUrl = (url) => {
    if (!searchQuery) {
      return url;
    }

    const paramKey = 'search';

    if (typeof window !== 'undefined') {
      try {
        const absoluteUrl = new URL(url, window.location.origin);
        absoluteUrl.searchParams.set(paramKey, searchQuery);

        if (absoluteUrl.origin === window.location.origin) {
          return `${absoluteUrl.pathname}${absoluteUrl.search}${absoluteUrl.hash}`;
        }

        return absoluteUrl.toString();
      } catch (error) {
        console.warn(
          'Failed to build result URL, falling back to manual construction:',
          error
        );
      }
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${paramKey}=${encodeURIComponent(searchQuery)}`;
  };
  const currentLang = params.lang || i18n.language || 'en';

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    const currentParams = new URLSearchParams(searchParams);
    currentParams.set(QueryParamKey.SearchQuery, suggestion);
    window.location.search = currentParams.toString();
  };

  // Fetch search results when query or language changes
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchQuery.trim() || !backendHost) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Prepare headers with hostname detection for domain-based organization detection
        const headers = {
          'Content-Type': 'application/json',
        };

        // Send the current hostname to the backend for proper domain detection
        if (typeof window !== 'undefined') {
          headers['X-Original-Host'] = window.location.hostname;
          headers['X-Frontend-Host'] = window.location.hostname;
          // Note: Cannot override Host header due to browser security restrictions
        }

        // Add authentication token if available (to access protected content in search)
        if (user?.token) {
          headers['Authorization'] = `Bearer ${user.token}`;
        }

        const response = await fetch(
          `${backendHost}/page/website_search/${currentLang}?q=${encodeURIComponent(searchQuery)}&limit=100`,
          {
            method: 'GET',
            headers: headers,
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setSearchResults(data.results || []);
        setSuggestions(data.suggestions || []);
      } catch (err) {
        console.error('Error fetching search results:', err);
        setError(err.message);
        setSearchResults([]);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [searchQuery, currentLang, backendHost]);

  return (
    <main className="min-h-screen flex flex-col">
      {user && !isPreviewMode && (
        <Suspense>
          <AdminHeader editPath={`/admin/pages/${initialPageData?.id}/edit`} />
        </Suspense>
      )}

      <WebsiteHeader />

      <div className="flex-grow container mx-auto px-4 py-12 max-w-4xl min-h-[60vh]">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-center mb-4">Search</h1>
          {searchQuery && (
            <p className="text-center text-gray-600">
              {loading
                ? 'Searching...'
                : searchResults.length > 0
                  ? `${searchResults.length} results`
                  : 'No results'}
            </p>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <p className="text-red-600">
              Something went wrong. Please try again.
            </p>
          </div>
        )}

        {/* Suggestions */}
        {!loading &&
          !error &&
          searchQuery &&
          searchResults.length === 0 &&
          suggestions.length > 0 && (
            <div className="text-center mb-12 py-8">
              <p className="text-lg text-gray-700 mb-4">
                Did you mean{' '}
                {suggestions.map((suggestion, index) => (
                  <span key={index}>
                    <button
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-primary-main hover:text-red-700 underline font-semibold text-xl"
                    >
                      {suggestion}
                    </button>
                    {index < suggestions.length - 1 && (
                      <span className="text-gray-700">
                        {index === suggestions.length - 2 ? ' or ' : ', '}
                      </span>
                    )}
                  </span>
                ))}
                ?
              </p>
            </div>
          )}

        {/* Results */}
        {!loading && !error && searchResults.length > 0 && (
          <div className="space-y-6">
            {searchResults.map((result) => (
              <div key={result.id} className="group">
                <h2 className="text-xl font-medium mb-1">
                  <a
                    href={buildResultUrl(result.url)}
                    className="text-primary-main hover:text-red-700 hover:underline"
                  >
                    {result.title}
                  </a>
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {result.contentType}
                  </span>
                  {result.publishDate && (
                    <span>
                      {new Date(result.publishDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading &&
          !error &&
          searchQuery &&
          searchResults.length === 0 &&
          suggestions.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500">
                No results found. Try different keywords.
              </p>
            </div>
          )}

        {/* No Search Query */}
        {!searchQuery && (
          <div className="text-center py-16">
            <p className="text-gray-500">Enter a search term to get started</p>
          </div>
        )}

        {/* Custom Code Injection after content - Site-wide only for search results */}
        <CustomCodeErrorBoundary>
          <CustomCodeRenderer
            pageData={null}
            contentData={null}
            type="search_result"
          />
        </CustomCodeErrorBoundary>
      </div>

      <WebsiteFooter />
    </main>
  );
}
