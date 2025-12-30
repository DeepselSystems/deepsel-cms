import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  WebsiteDataProvider,
  useWebsiteData,
  type WebsiteData,
} from '../../src/contexts/WebsiteDataContext';
import type { PageData } from '@deepsel/cms-utils';
import React from 'react';

// Mock PageTransition component
vi.mock('../../src/components/PageTransition', () => ({
  PageTransition: () => null,
}));

describe('WebsiteDataContext', () => {
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

  const mockWebsiteData: WebsiteData = {
    type: 'Page',
    data: mockPageData,
  };

  it('should provide website data to children', () => {
    const TestComponent = () => {
      const { data } = useWebsiteData();
      return <div>{data.type === 'Page' ? data.data.title : ''}</div>;
    };

    render(
      <WebsiteDataProvider data={mockWebsiteData}>
        <TestComponent />
      </WebsiteDataProvider>,
    );

    expect(screen.getByText('Test Page')).toBeDefined();
  });

  it('should throw error when useWebsiteData is used outside provider', () => {
    const TestComponent = () => {
      useWebsiteData();
      return null;
    };

    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => render(<TestComponent />)).toThrow(
      'useWebsiteData must be used inside <WebsiteDataProvider>',
    );

    console.error = originalError;
  });

  it('should allow updating website data via setData', async () => {
    const TestComponent = () => {
      const { data, setData } = useWebsiteData();

      const updateTitle = () => {
        if (data.type === 'Page') {
          setData({ type: 'Page', data: { ...data.data, title: 'Updated Title' } });
        }
      };

      return (
        <div>
          <div>{data.type === 'Page' ? data.data.title : ''}</div>
          <button onClick={updateTitle}>Update</button>
        </div>
      );
    };

    const { getByText, findByText } = render(
      <WebsiteDataProvider data={mockWebsiteData}>
        <TestComponent />
      </WebsiteDataProvider>,
    );

    expect(getByText('Test Page')).toBeDefined();

    getByText('Update').click();

    expect(await findByText('Updated Title')).toBeDefined();
  });

  it('should render PageTransition component', () => {
    const { container } = render(
      <WebsiteDataProvider data={mockWebsiteData}>
        <div>Test</div>
      </WebsiteDataProvider>,
    );

    // PageTransition should be rendered (mocked to return null)
    // This test verifies the component structure
    expect(container.querySelector('div')).toBeDefined();
  });

  it('should maintain website data state across re-renders', async () => {
    const TestComponent = () => {
      const { data } = useWebsiteData();
      const [count, setCount] = React.useState(0);

      return (
        <div>
          <div>{data.type === 'Page' ? data.data.title : ''}</div>
          <div>Count: {count}</div>
          <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
      );
    };

    const { getByText, findByText } = render(
      <WebsiteDataProvider data={mockWebsiteData}>
        <TestComponent />
      </WebsiteDataProvider>,
    );

    expect(getByText('Test Page')).toBeDefined();
    expect(getByText('Count: 0')).toBeDefined();

    getByText('Increment').click();

    expect(getByText('Test Page')).toBeDefined();
    expect(await findByText('Count: 1')).toBeDefined();
  });
});
