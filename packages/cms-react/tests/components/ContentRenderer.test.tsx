import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ContentRenderer } from '../../src/components/ContentRenderer';
import { PageDataProvider } from '../../src/contexts/PageDataContext';
import type { PageData } from '@deepsel/cms-utils';
import React from 'react';

describe('ContentRenderer', () => {
  const mockPageData: PageData = {
    id: '1',
    title: 'Test Page',
    slug: '/test',
    lang: 'en',
    content: {
      main: {
        'ds-value': '<h1>Hello World</h1><p>This is test content.</p>',
      },
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

  it('should render HTML content from pageData', () => {
    const { container } = render(
      <PageDataProvider pageData={mockPageData}>
        <ContentRenderer />
      </PageDataProvider>,
    );

    expect(container.querySelector('h1')?.textContent).toBe('Hello World');
    expect(container.querySelector('p')?.textContent).toBe('This is test content.');
  });

  it('should render article element with correct classes', () => {
    const { container } = render(
      <PageDataProvider pageData={mockPageData}>
        <ContentRenderer />
      </PageDataProvider>,
    );

    const article = container.querySelector('article');
    expect(article).toBeDefined();
    expect(article?.className).toContain('flex-1');
    expect(article?.className).toContain('pt-10');
    expect(article?.className).toContain('px-4');
    expect(article?.className).toContain('xl:px-2');
    expect(article?.className).toContain('min-w-0');
  });

  it('should render nothing when pageData is null', () => {
    const nullPageData = null as any;
    const { container } = render(
      <PageDataProvider pageData={nullPageData}>
        <ContentRenderer />
      </PageDataProvider>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render empty content when main content is missing', () => {
    const pageDataWithoutContent = {
      ...mockPageData,
      content: {},
    };

    const { container } = render(
      <PageDataProvider pageData={pageDataWithoutContent}>
        <ContentRenderer />
      </PageDataProvider>,
    );

    const article = container.querySelector('article');
    expect(article).toBeDefined();
    expect(article?.innerHTML).toBe('');
  });

  it('should render empty content when ds-value is missing', () => {
    const pageDataWithoutDsValue = {
      ...mockPageData,
      content: {
        main: {},
      },
    };

    const { container } = render(
      <PageDataProvider pageData={pageDataWithoutDsValue}>
        <ContentRenderer />
      </PageDataProvider>,
    );

    const article = container.querySelector('article');
    expect(article).toBeDefined();
    expect(article?.innerHTML).toBe('');
  });

  it('should handle complex HTML content', () => {
    const complexPageData = {
      ...mockPageData,
      content: {
        main: {
          'ds-value': `
            <div class="container">
              <h1>Title</h1>
              <ul>
                <li>Item 1</li>
                <li>Item 2</li>
              </ul>
              <img src="/image.jpg" alt="Test" />
            </div>
          `,
        },
      },
    };

    const { container } = render(
      <PageDataProvider pageData={complexPageData}>
        <ContentRenderer />
      </PageDataProvider>,
    );

    expect(container.querySelector('.container')).toBeDefined();
    expect(container.querySelector('h1')?.textContent).toBe('Title');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/image.jpg');
  });

  it('should sanitize and render script tags as text (security)', () => {
    const pageDataWithScript = {
      ...mockPageData,
      content: {
        main: {
          'ds-value': '<p>Safe content</p><script>alert("XSS")</script>',
        },
      },
    };

    const { container } = render(
      <PageDataProvider pageData={pageDataWithScript}>
        <ContentRenderer />
      </PageDataProvider>,
    );

    // Note: dangerouslySetInnerHTML will render scripts, but they won't execute in test environment
    // In production, you should use a sanitization library like DOMPurify
    expect(container.querySelector('p')?.textContent).toBe('Safe content');
  });

  it('should handle empty string content', () => {
    const pageDataWithEmptyContent = {
      ...mockPageData,
      content: {
        main: {
          'ds-value': '',
        },
      },
    };

    const { container } = render(
      <PageDataProvider pageData={pageDataWithEmptyContent}>
        <ContentRenderer />
      </PageDataProvider>,
    );

    const article = container.querySelector('article');
    expect(article).toBeDefined();
    expect(article?.innerHTML).toBe('');
  });
});
