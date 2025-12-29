import { fetchPublicSettings } from './fetchPublicSettings';
import type { PageData } from './types';
import type { SiteSettings } from '../types';

interface FetchPageDataProps {
  path: string;
  lang?: string;
  astroRequest?: Request;
  authToken?: string;
  backendHost?: string;
}

/**
 * Fetches page data from the backend by language and slug
 */
export async function fetchPageData({
  path,
  lang,
  astroRequest,
  authToken,
  backendHost = 'http://localhost:8000',
}: FetchPageDataProps): Promise<PageData> {
  try {
    // Format the path properly, make sure it starts with a slash
    let formattedPath = path.startsWith('/') ? path : `/${path}`;
    // Backend will consider 'default' as the home slug
    if (formattedPath === '/') {
      formattedPath = '/default';
    }

    // Determine the URL based on whether a language is provided
    const langPrefix = lang || 'default';
    let url = `${backendHost}/page/website/${langPrefix}${formattedPath}`;

    // Add preview parameter if enabled
    if (astroRequest) {
      const previewParam = new URL(astroRequest.url).searchParams.get('preview');
      if (previewParam === 'true') {
        url += `?preview=true`;
      }
    }

    // Prepare fetch options
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      } as Record<string, string>,
    };

    // Send the current hostname to the backend for proper domain detection
    let hostname = null;

    // Server-side: Extract hostname from Astro request
    if (astroRequest) {
      const requestUrl = new URL(astroRequest.url);
      hostname = requestUrl.hostname;
    }
    // Client-side: Extract hostname from window
    else if (typeof window !== 'undefined') {
      hostname = window.location.hostname;
    }

    if (hostname) {
      fetchOptions.headers['X-Original-Host'] = hostname;
      fetchOptions.headers['X-Frontend-Host'] = hostname;
      // Note: Cannot override Host header due to browser security restrictions
    }

    // Add authentication headers if token exists (for both preview and protected content)
    if (authToken) {
      fetchOptions.headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Fetch the page data from the backend
    const response = await fetch(url, fetchOptions);

    // Handle authentication errors
    if (response.status === 401) {
      throw new Error('Authentication required');
    }

    // Only treat actual 404 as not found
    if (response.status === 404) {
      try {
        const { detail } = await response.json();
        console.warn('404', url, { detail });
      } catch (error) {
        console.warn('404', url);
      }

      // When page is not found, still fetch menus and site settings
      try {
        const siteSettings: SiteSettings = await fetchPublicSettings(
          null,
          astroRequest,
          lang,
          backendHost,
        );
        return {
          notFound: true,
          public_settings: siteSettings,
        };
      } catch (settingsError) {
        console.warn('Could not fetch site settings for 404 page:', settingsError);
        throw new Error(`Page not found`);
      }
    }

    try {
      // Parse the JSON
      const jsonData = await response.json();

      return jsonData;
    } catch (parseError: any) {
      console.error(`Failed to parse response: ${parseError.message}`);
      throw new Error(`Failed to parse response: ${parseError.message}`);
    }
  } catch (error: any) {
    console.error('Error fetching page data:', error);
    throw error;
  }
}
