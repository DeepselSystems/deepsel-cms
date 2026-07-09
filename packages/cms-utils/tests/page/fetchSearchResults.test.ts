import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fetchSearchResults } from '../../src/page/fetchSearchResults';

function makeJsonResponse(data: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 404,
    statusText: ok ? 'OK' : 'Not Found',
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

const defaultSettings = {
  selected_theme: 'theme-1',
  default_language: { iso_code: 'en' },
};

const defaultSearchResponse = {
  results: [
    {
      id: '1',
      title: 'Test',
      url: '/test',
      publishDate: null,
      contentType: 'Page',
      relevanceScore: 1,
    },
  ],
  total: 1,
  suggestions: [],
};

describe('fetchSearchResults', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passes backendHost (not a hardcoded URL) to fetchPublicSettings', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation((url) => {
      if (String(url).includes('/util/public_settings')) {
        return Promise.resolve(makeJsonResponse(defaultSettings));
      }
      return Promise.resolve(makeJsonResponse(defaultSearchResponse));
    });

    await fetchSearchResults({ q: 'identity' });

    const settingsCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/util/public_settings'),
    );
    expect(settingsCall).toBeDefined();
    // The default backendHost includes /api/v1, so the URL must contain it
    expect(String(settingsCall![0])).toContain('/api/v1/util/public_settings');
    expect(String(settingsCall![0])).not.toMatch(/^http:\/\/localhost:8000\/util/);
  });

  it('uses a custom backendHost for the settings request', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation((url) => {
      if (String(url).includes('/util/public_settings')) {
        return Promise.resolve(makeJsonResponse(defaultSettings));
      }
      return Promise.resolve(makeJsonResponse(defaultSearchResponse));
    });

    await fetchSearchResults({ q: 'test', backendHost: 'http://example.com/api/v1' });

    const settingsCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/util/public_settings'),
    );
    expect(settingsCall).toBeDefined();
    expect(String(settingsCall![0])).toContain('http://example.com/api/v1/util/public_settings');
  });

  it('returns empty results for an empty query without making a search API call', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation((url) => {
      if (String(url).includes('/util/public_settings')) {
        return Promise.resolve(makeJsonResponse(defaultSettings));
      }
      return Promise.resolve(makeJsonResponse(defaultSearchResponse));
    });

    const result = await fetchSearchResults({ q: '' });

    expect(result.results).toEqual([]);
    expect(result.total).toBe(0);
    // No search endpoint call, only the settings call
    const searchCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes('/website_search/'),
    );
    expect(searchCalls).toHaveLength(0);
  });
});
