import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchSearchResults } from '../../src/page/fetchSearchResults';

vi.mock('../../src/page/fetchPublicSettings', () => ({
  fetchPublicSettings: vi.fn().mockResolvedValue({
    selected_theme: 'starter_react',
    default_language: { iso_code: 'en' },
  }),
}));

import { fetchPublicSettings } from '../../src/page/fetchPublicSettings';

const mockFetchPublicSettings = fetchPublicSettings as ReturnType<typeof vi.fn>;

describe('fetchSearchResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPublicSettings.mockResolvedValue({
      selected_theme: 'starter_react',
      default_language: { iso_code: 'en' },
    });
  });

  it('passes backendHost to fetchPublicSettings', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], total: 0, suggestions: [] }),
    }));

    await fetchSearchResults({ q: 'test' });

    expect(mockFetchPublicSettings).toHaveBeenCalledWith(
      null,
      null,
      'default',
      'http://localhost:8000/api/v1',
    );

    vi.unstubAllGlobals();
  });

  it('constructs correct search URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], total: 0, suggestions: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchSearchResults({ q: 'hello', lang: 'en' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/page/website_search/en?q=hello&limit=100',
      expect.objectContaining({ method: 'GET' }),
    );

    vi.unstubAllGlobals();
  });

  it('returns empty results for empty query without calling search API', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchSearchResults({ q: '  ' });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.total).toBe(0);
    expect(result.results).toEqual([]);

    vi.unstubAllGlobals();
  });

  it('handles search API failure gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await fetchSearchResults({ q: 'hello' });

    expect(result.results).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.query).toBe('hello');

    vi.unstubAllGlobals();
  });

  it('handles settings API failure gracefully', async () => {
    mockFetchPublicSettings.mockRejectedValue(new Error('Settings unavailable'));

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], total: 0, suggestions: [] }),
    }));

    const result = await fetchSearchResults({ q: 'hello' });

    expect(result.public_settings).toEqual({});

    vi.unstubAllGlobals();
  });
});
