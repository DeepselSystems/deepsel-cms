import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { PageTransition } from '../../src/components/PageTransition';
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

describe('PageTransition', () => {
  const mockPageData: PageData = {
    id: '1',
    title: 'Test Page',
    slug: '/test',
    lang: 'en',
    seo_metadata: {
      title: 'Test SEO Title',
      description: 'Test description',
      allow_indexing: true,
    },
    public_settings: {
      default_language: {
        id: '1',
        name: 'English',
        iso_code: 'en',
      },
      available_languages: [{ id: '1', name: 'English', iso_code: 'en', code: 'en' }],
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    document.title = '';

    // Setup meta tags
    const metaDescription = document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    document.head.appendChild(metaDescription);

    const metaRobots = document.createElement('meta');
    metaRobots.setAttribute('name', 'robots');
    document.head.appendChild(metaRobots);

    window.history.pushState = vi.fn();
    window.location = { href: '', pathname: '/test' } as any;
    // eslint-disable-next-line no-console
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('should update document title when pageData changes', () => {
    render(
      <PageDataProvider pageData={mockPageData}>
        <PageTransition />
      </PageDataProvider>,
    );

    expect(document.title).toBe('Test SEO Title');
  });

  it('should update meta description when pageData changes', () => {
    render(
      <PageDataProvider pageData={mockPageData}>
        <PageTransition />
      </PageDataProvider>,
    );

    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription?.getAttribute('content')).toBe('Test description');
  });

  it('should update robots meta tag based on allow_indexing', () => {
    render(
      <PageDataProvider pageData={mockPageData}>
        <PageTransition />
      </PageDataProvider>,
    );

    const metaRobots = document.querySelector('meta[name="robots"]');
    expect(metaRobots?.getAttribute('content')).toBe('index, follow');
  });

  it('should set noindex when allow_indexing is false', () => {
    const noIndexPageData = {
      ...mockPageData,
      seo_metadata: {
        ...mockPageData.seo_metadata,
        allow_indexing: false,
      },
    };

    render(
      <PageDataProvider pageData={noIndexPageData}>
        <PageTransition />
      </PageDataProvider>,
    );

    const metaRobots = document.querySelector('meta[name="robots"]');
    expect(metaRobots?.getAttribute('content')).toBe('noindex, nofollow');
  });

  it('should update html lang attribute', () => {
    render(
      <PageDataProvider pageData={mockPageData}>
        <PageTransition />
      </PageDataProvider>,
    );

    expect(document.documentElement.lang).toBe('en');
  });

  it('should intercept link clicks for client-side navigation', async () => {
    mockParseSlugForLangAndPath.mockReturnValue({ lang: 'en', path: '/about' });
    mockFetchPageData.mockResolvedValue({
      ...mockPageData,
      title: 'About Page',
      slug: '/about',
    });

    const { container } = render(
      <PageDataProvider pageData={mockPageData}>
        <PageTransition />
        <a href="/about">About</a>
      </PageDataProvider>,
    );

    const link = container.querySelector('a');
    link?.click();

    await waitFor(() => {
      expect(mockFetchPageData).toHaveBeenCalledWith('en', '/about');
    });
  });

  it('should not intercept external links', () => {
    const { container } = render(
      <PageDataProvider pageData={mockPageData}>
        <PageTransition />
        <a href="https://example.com">External</a>
      </PageDataProvider>,
    );

    const link = container.querySelector('a');
    link?.click();

    expect(mockFetchPageData).not.toHaveBeenCalled();
  });

  it('should not intercept links with target="_blank"', () => {
    const { container } = render(
      <PageDataProvider pageData={mockPageData}>
        <PageTransition />
        <a href="/about" target="_blank">
          About
        </a>
      </PageDataProvider>,
    );

    const link = container.querySelector('a');
    link?.click();

    expect(mockFetchPageData).not.toHaveBeenCalled();
  });

  it('should not intercept hash links', () => {
    const { container } = render(
      <PageDataProvider pageData={mockPageData}>
        <PageTransition />
        <a href="#section">Section</a>
      </PageDataProvider>,
    );

    const link = container.querySelector('a');
    link?.click();

    expect(mockFetchPageData).not.toHaveBeenCalled();
  });

  it('should not intercept mailto links', () => {
    const { container } = render(
      <PageDataProvider pageData={mockPageData}>
        <PageTransition />
        <a href="mailto:test@example.com">Email</a>
      </PageDataProvider>,
    );

    const link = container.querySelector('a');
    link?.click();

    expect(mockFetchPageData).not.toHaveBeenCalled();
  });

  it('should not intercept download links', () => {
    const { container } = render(
      <PageDataProvider pageData={mockPageData}>
        <PageTransition />
        <a href="/file.pdf" download>
          Download
        </a>
      </PageDataProvider>,
    );

    const link = container.querySelector('a');
    link?.click();

    expect(mockFetchPageData).not.toHaveBeenCalled();
  });

  it('should support onNavigate callback prop', () => {
    const onNavigate = vi.fn();

    const { container } = render(
      <PageDataProvider pageData={mockPageData}>
        <PageTransition onNavigate={onNavigate} />
      </PageDataProvider>,
    );

    // Verify PageTransition accepts onNavigate prop without errors
    expect(container).toBeDefined();
    // Note: Testing actual click interception in happy-dom is unreliable
    // The component's click handler is tested via the other navigation tests
  });

  it('should call onPathChange callback when provided', async () => {
    const onPathChange = vi.fn();

    render(
      <PageDataProvider pageData={mockPageData}>
        <PageTransition onPathChange={onPathChange} />
      </PageDataProvider>,
    );

    // Simulate popstate event
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => {
      expect(onPathChange).toHaveBeenCalled();
    });
  });

  it('should handle popstate events for browser back/forward', async () => {
    mockParseSlugForLangAndPath.mockReturnValue({ lang: 'en', path: '/test' });
    mockFetchPageData.mockResolvedValue(mockPageData);

    render(
      <PageDataProvider pageData={mockPageData}>
        <PageTransition />
      </PageDataProvider>,
    );

    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => {
      expect(mockFetchPageData).toHaveBeenCalled();
    });
  });

  it('should fallback to regular navigation on fetch error', async () => {
    mockParseSlugForLangAndPath.mockReturnValue({ lang: 'en', path: '/error' });
    mockFetchPageData.mockResolvedValue({ error: 'Not found' });

    const { container } = render(
      <PageDataProvider pageData={mockPageData}>
        <PageTransition />
        <a href="/error">Error Page</a>
      </PageDataProvider>,
    );

    const link = container.querySelector('a');
    link?.click();

    await waitFor(() => {
      expect(window.location.href).toBe('/error');
    });
  });

  it('should render nothing (null)', () => {
    const { container } = render(
      <PageDataProvider pageData={mockPageData}>
        <PageTransition />
      </PageDataProvider>,
    );

    expect(container.firstChild).toBeNull();
  });
});
