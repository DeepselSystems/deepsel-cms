import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchSearchResults } from '../../src/page/fetchSearchResults';

const BACKEND_HOST = 'http://localhost:8000/api/v1';

function makeJsonResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Not Found',
    json: async () => data,
  } as unknown as Response;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('fetchSearchResults', () => {
  it('calls fetchPublicSettings with the /api/v1 backendHost', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('public_settings')) {
        return makeJsonResponse({ selected_theme: 'starter_react', default_language: { iso_code: 'en' } });
      }
      return makeJsonResponse({ results: [], total: 0, suggestions: [] });
    });

    await fetchSearchResults({ q: 'hello', backendHost: BACKEND_HOST });

    const settingsCall = fetchSpy.mock.calls.find(([url]) =>
      String(url).includes('public_settings'),
    );
    expect(settingsCall).toBeDefined();
    expect(String(settingsCall![0])).toContain('/api/v1/util/public_settings');
    expect(String(settingsCall![0])).not.toMatch(/^http:\/\/localhost:8000\/util/);
  });

  it('constructs the correct search URL with backendHost, lang, q, and limit', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('public_settings')) {
        return makeJsonResponse({ selected_theme: 'starter_react', default_language: { iso_code: 'en' } });
      }
      return makeJsonResponse({ results: [], total: 0, suggestions: [] });
    });

    await fetchSearchResults({ q: 'test query', lang: 'en', limit: 50, backendHost: BACKEND_HOST });

    const searchCall = fetchSpy.mock.calls.find(([url]) =>
      String(url).includes('website_search'),
    );
    expect(searchCall).toBeDefined();
    const searchUrl = String(searchCall![0]);
    expect(searchUrl).toContain(`${BACKEND_HOST}/page/website_search/en`);
    expect(searchUrl).toContain('q=test+query');
    expect(searchUrl).toContain('limit=50');
  });

  it('returns empty results without calling search API when query is empty', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('public_settings')) {
        return makeJsonResponse({ selected_theme: 'starter_react', default_language: { iso_code: 'en' } });
      }
      return makeJsonResponse({ results: [], total: 0, suggestions: [] });
    });

    const result = await fetchSearchResults({ q: '   ', backendHost: BACKEND_HOST });

    expect(result.results).toEqual([]);
    expect(result.total).toBe(0);
    const searchCall = fetchSpy.mock.calls.find(([url]) =>
      String(url).includes('website_search'),
    );
    expect(searchCall).toBeUndefined();
  });

  it('returns empty results when the search API call fails', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('public_settings')) {
        return makeJsonResponse({ selected_theme: 'starter_react', default_language: { iso_code: 'en' } });
      }
      throw new Error('Network error');
    });

    const result = await fetchSearchResults({ q: 'fail', backendHost: BACKEND_HOST });

    expect(result.results).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.query).toBe('fail');
  });

  it('returns empty results when the search API returns a non-ok response', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('public_settings')) {
        return makeJsonResponse({ selected_theme: 'starter_react', default_language: { iso_code: 'en' } });
      }
      return makeJsonResponse(null, false, 500);
    });

    const result = await fetchSearchResults({ q: 'error', backendHost: BACKEND_HOST });

    expect(result.results).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('returns results with empty public_settings when settings API fails', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('public_settings')) {
        throw new Error('Settings unavailable');
      }
      return makeJsonResponse({ results: [{ id: '1', title: 'Hello' }], total: 1, suggestions: [] });
    });

    const result = await fetchSearchResults({ q: 'hello', backendHost: BACKEND_HOST });

    expect(result.results).toHaveLength(1);
    expect(result.total).toBe(1);
    // public_settings falls back to empty object
    expect(result.public_settings).toEqual({});
  });
});
