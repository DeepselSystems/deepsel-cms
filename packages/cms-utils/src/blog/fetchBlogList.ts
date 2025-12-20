import type { BlogListResponse, FetchBlogListOptions } from './types';

/**
 * Fetches blog list from the backend by language
 * Corresponds to GET /blog_post/website/{lang}
 */
export async function fetchBlogList(options: FetchBlogListOptions): Promise<BlogListResponse> {
  const {
    lang,
    page = 1,
    page_size = 5,
    authToken = null,
    astroRequest = null,
    backendHost = 'http://localhost:8000',
  } = options;

  try {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: page_size.toString(),
    });

    const url = `${backendHost}/blog_post/website/${lang}?${params}`;

    const fetchOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      } as Record<string, string>,
    };

    let hostname = null;

    if (astroRequest) {
      const url = new URL(astroRequest.url);
      hostname = url.hostname;
    } else if (typeof window !== 'undefined') {
      hostname = window.location.hostname;
    }

    if (hostname) {
      fetchOptions.headers['X-Original-Host'] = hostname;
      fetchOptions.headers['X-Frontend-Host'] = hostname;
    }

    if (authToken) {
      fetchOptions.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, fetchOptions);

    if (response.status === 401) {
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch blog list: ${response.statusText}`);
    }

    const jsonData: BlogListResponse = await response.json();
    return jsonData;
  } catch (error: any) {
    console.error('Error fetching blog list:', error);
    throw error;
  }
}
