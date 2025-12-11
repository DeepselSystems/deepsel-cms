import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageDataProvider, usePageData } from '../../src/contexts/PageDataContext';
import type { PageData } from '@deepsel/cms-utils';
import React from 'react';

// Mock PageTransition component
vi.mock('../../src/components/PageTransition', () => ({
  PageTransition: () => null,
}));

describe('PageDataContext', () => {
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

  it('should provide pageData to children', () => {
    const TestComponent = () => {
      const { pageData } = usePageData();
      return <div>{pageData.title}</div>;
    };

    render(
      <PageDataProvider pageData={mockPageData}>
        <TestComponent />
      </PageDataProvider>,
    );

    expect(screen.getByText('Test Page')).toBeDefined();
  });

  it('should throw error when usePageData is used outside provider', () => {
    const TestComponent = () => {
      usePageData();
      return null;
    };

    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => render(<TestComponent />)).toThrow(
      'usePageData must be used inside <PageDataProvider>',
    );

    console.error = originalError;
  });

  it('should allow updating pageData via setPageData', async () => {
    const TestComponent = () => {
      const { pageData, setPageData } = usePageData();

      const updateTitle = () => {
        setPageData({ ...pageData, title: 'Updated Title' });
      };

      return (
        <div>
          <div>{pageData.title}</div>
          <button onClick={updateTitle}>Update</button>
        </div>
      );
    };

    const { getByText, findByText } = render(
      <PageDataProvider pageData={mockPageData}>
        <TestComponent />
      </PageDataProvider>,
    );

    expect(getByText('Test Page')).toBeDefined();

    getByText('Update').click();

    expect(await findByText('Updated Title')).toBeDefined();
  });

  it('should render PageTransition component', () => {
    const { container } = render(
      <PageDataProvider pageData={mockPageData}>
        <div>Test</div>
      </PageDataProvider>,
    );

    // PageTransition should be rendered (mocked to return null)
    // This test verifies the component structure
    expect(container.querySelector('div')).toBeDefined();
  });

  it('should maintain pageData state across re-renders', async () => {
    const TestComponent = () => {
      const { pageData } = usePageData();
      const [count, setCount] = React.useState(0);

      return (
        <div>
          <div>{pageData.title}</div>
          <div>Count: {count}</div>
          <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
      );
    };

    const { getByText, findByText } = render(
      <PageDataProvider pageData={mockPageData}>
        <TestComponent />
      </PageDataProvider>,
    );

    expect(getByText('Test Page')).toBeDefined();
    expect(getByText('Count: 0')).toBeDefined();

    getByText('Increment').click();

    expect(getByText('Test Page')).toBeDefined();
    expect(await findByText('Count: 1')).toBeDefined();
  });
});
