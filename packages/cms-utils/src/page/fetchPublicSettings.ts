import type { SiteSettings } from '../types';

/**
 * Fetches public settings from the backend
 */
export async function fetchPublicSettings(
  orgId: number | null = null,
  astroRequest: Request | null = null,
  lang: string | null = null,
  backendHost: string = 'http://localhost:8000',
): Promise<SiteSettings> {
  try {
    let url;

    if (orgId === null) {
      // Use domain-based detection when orgId is null
      url = `${backendHost}/util/public_settings`;
      if (lang) {
        url += `?lang=${encodeURIComponent(lang)}`;
      }
    } else {
      // Handle server-side environment where localStorage is not available
      let organizationId = orgId;

      // Only access localStorage if we're in a browser environment and orgId not provided
      if (typeof window !== 'undefined' && window.localStorage && !orgId) {
        const storedOrgId = localStorage.getItem('organizationId');
        organizationId = storedOrgId ? parseInt(storedOrgId) : 1;
      }

      url = `${backendHost}/util/public_settings/${organizationId}`;
      if (lang) {
        url += `?lang=${encodeURIComponent(lang)}`;
      }
    }

    // Detect current hostname for domain-based organization detection
    const headers = {
      'Content-Type': 'application/json',
    } as Record<string, string>;

    // For domain-based detection, send the current hostname to the backend
    if (orgId === null) {
      let hostname = null;

      // Server-side: Extract hostname from Astro request
      if (astroRequest) {
        const url = new URL(astroRequest.url);
        hostname = url.hostname;
      }
      // Client-side: Extract hostname from window
      else if (typeof window !== 'undefined') {
        hostname = window.location.hostname;
      }

      if (hostname) {
        headers['X-Original-Host'] = hostname;
        headers['X-Frontend-Host'] = hostname;
        // Note: Cannot override Host header due to browser security restrictions
      }
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as SiteSettings;
    return data;
  } catch (error) {
    console.error('Error fetching public settings:', error);
    throw error;
  }
}
