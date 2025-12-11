import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigation } from '../../src/hooks/useNavigation';
import { PageDataProvider } from '../../src/contexts/PageDataContext';
import type { PageData } from '@deepsel/cms-utils';
import React from 'react';

// Mock cms-utils
const mockFetchPageData = vi.fn<(lang: string | null, path: string) => Promise<any>>();
const mockParseSlugForLangAndPath =
  vi.fn<(pathname: string) => { lang: string | null; path: string }>();

vi.mock('@deepsel/cms-utils', () => ({
  fetchPageData: (lang: string | null, path: string) => mockFetchPageData(lang, path),
  parseSlugForLangAndPath: (pathname: string) => mockParseSlugForLangAndPath(pathname),
}));

describe('useNavigation', () => {
  const mockPageData: PageData = {
    id: '1',
    title: 'Test Page',
    slug: '/test',
    lang: 'en',
    public_settings: {
      default_language: {
        id: '1',
        name: 'English',
        iso_code: 'en',
      },
      available_languages: [{ id: '1', name: 'English', iso_code: 'en', code: 'en' }],
    },
  } as any;

  const mockNewPageData: PageData = {
    id: '2',
    title: 'New Page',
    slug: '/new-page',
    lang: 'en',
    public_settings: mockPageData.public_settings,
  } as any;

  let pushStateSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    window.location = { href: '' } as any;
    // eslint-disable-next-line no-console
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    pushStateSpy?.mockRestore();
  });

  it('should navigate to a new URL successfully', async () => {
    mockParseSlugForLangAndPath.mockReturnValue({ lang: 'en', path: '/new-page' });
    mockFetchPageData.mockResolvedValue(mockNewPageData);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PageDataProvider pageData={mockPageData}>{children}</PageDataProvider>
    );

    const { result } = renderHook(() => useNavigation(), { wrapper });

    await act(async () => {
      await result.current.navigate('/new-page');
    });

    expect(mockParseSlugForLangAndPath).toHaveBeenCalledWith('/new-page');
    expect(mockFetchPageData).toHaveBeenCalledWith('en', '/new-page');
    expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/new-page');
  });

  it('should handle navigation errors gracefully', async () => {
    mockParseSlugForLangAndPath.mockReturnValue({ lang: 'en', path: '/error-page' });
    mockFetchPageData.mockRejectedValue(new Error('Network error'));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PageDataProvider pageData={mockPageData}>{children}</PageDataProvider>
    );

    const { result } = renderHook(() => useNavigation(), { wrapper });

    await act(async () => {
      await result.current.navigate('/error-page');
    });

    expect(console.error).toHaveBeenCalledWith('Navigation error:', expect.any(Error));
    expect(window.location.href).toBe('/error-page');
  });

  it('should fallback to page reload on 404', async () => {
    mockParseSlugForLangAndPath.mockReturnValue({ lang: 'en', path: '/not-found' });
    mockFetchPageData.mockResolvedValue({ notFound: true });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PageDataProvider pageData={mockPageData}>{children}</PageDataProvider>
    );

    const { result } = renderHook(() => useNavigation(), { wrapper });

    await act(async () => {
      await result.current.navigate('/not-found');
    });

    expect(console.warn).toHaveBeenCalledWith(
      'Failed to fetch page data, falling back to page reload',
    );
    expect(window.location.href).toBe('/not-found');
  });

  it('should fallback to page reload on error response', async () => {
    mockParseSlugForLangAndPath.mockReturnValue({ lang: 'en', path: '/error' });
    mockFetchPageData.mockResolvedValue({ error: 'Server error' });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PageDataProvider pageData={mockPageData}>{children}</PageDataProvider>
    );

    const { result } = renderHook(() => useNavigation(), { wrapper });

    await act(async () => {
      await result.current.navigate('/error');
    });

    expect(console.warn).toHaveBeenCalledWith(
      'Failed to fetch page data, falling back to page reload',
    );
    expect(window.location.href).toBe('/error');
  });

  it('should parse language-prefixed URLs correctly', async () => {
    mockParseSlugForLangAndPath.mockReturnValue({ lang: 'de', path: '/about' });
    mockFetchPageData.mockResolvedValue({
      ...mockNewPageData,
      lang: 'de',
      slug: '/about',
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PageDataProvider pageData={mockPageData}>{children}</PageDataProvider>
    );

    const { result } = renderHook(() => useNavigation(), { wrapper });

    await act(async () => {
      await result.current.navigate('/de/about');
    });

    expect(mockParseSlugForLangAndPath).toHaveBeenCalledWith('/de/about');
    expect(mockFetchPageData).toHaveBeenCalledWith('de', '/about');
  });

  it('should log navigation attempts', async () => {
    mockParseSlugForLangAndPath.mockReturnValue({ lang: 'en', path: '/test' });
    mockFetchPageData.mockResolvedValue(mockNewPageData);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PageDataProvider pageData={mockPageData}>{children}</PageDataProvider>
    );

    const { result } = renderHook(() => useNavigation(), { wrapper });

    await act(async () => {
      await result.current.navigate('/test');
    });
  });
});
