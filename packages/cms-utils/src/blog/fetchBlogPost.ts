import type { BlogPostData } from './types';

/**
 * Fetches a single blog post from the backend by language and slug
 * Corresponds to GET /blog_post/website/{lang}/{slug}
 */
export async function fetchBlogPost(
  slug: string,
  lang?: string,
  astroRequest?: Request,
  authToken?: string,
  backendHost: string = 'http://localhost:8000',
): Promise<BlogPostData> {
  try {
    const cleanSlug = slug.startsWith('/') ? slug.substring(1) : slug;
    const langPrefix = lang || 'default';
    const url = `${backendHost}/blog_post/website/${langPrefix}/${cleanSlug}`;

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

    if (response.status === 404) {
      const { detail } = (await response.json()) as { detail?: string };
      throw new Error(detail || 'Blog post not found');
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch blog post: ${response.statusText}`);
    }

    const jsonData: BlogPostData = await response.json();
    return jsonData;
  } catch (error: any) {
    console.error('Error fetching blog post:', error);
    throw error;
  }
}
