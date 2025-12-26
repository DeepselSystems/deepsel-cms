import type { BlogListData } from './types';
import type { Pagination } from '../page/getPathType';
/**
 * Fetches blog list from the backend by language
 * Corresponds to GET /blog_post/website/{lang}
 */
export async function fetchBlogList(
  astroRequest?: Request,
  pagination?: Pagination,
  authToken?: string,
  lang: string = 'default',
  backendHost: string = 'http://localhost:8000',
): Promise<BlogListData> {
  try {
    let url = `${backendHost}/blog_post/website/${lang}`;

    if (pagination) {
      const searchParams = new URLSearchParams();
      if (pagination.page) searchParams.append('page', pagination.page.toString());
      if (pagination.pageSize) searchParams.append('page_size', pagination.pageSize.toString());
      url += `?${searchParams.toString()}`;
    }

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

    const jsonData: BlogListData = await response.json();
    return jsonData;
  } catch (error: any) {
    console.error('Error fetching blog list:', error);
    throw error;
  }
}
