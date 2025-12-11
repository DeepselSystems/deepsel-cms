/**
 * Fetches Form data from the backend by language and slug
 */
export async function fetchFormData(
  lang: string,
  slug: string,
  backendHost: string = 'http://localhost:8000',
): Promise<Record<string, unknown>> {
  try {
    // Format the slug properly
    const formattedSlug = slug.replace(/^\/forms\//, '');

    // Determine the URL based on whether a language is provided
    const url = `${backendHost}/form/website/${lang}/${formattedSlug}`;

    // Prepare fetch options
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Fetch the page data from the backend
    const response = await fetch(url, fetchOptions);

    // Only treat actual 404 as not found
    if (response.status === 404) {
      const { detail } = await response.json();
      console.warn('404', url, { detail });
      return { notFound: true, status: 404, detail };
    }

    try {
      // Parse the JSON
      return await response.json();
    } catch (parseError: any) {
      console.error(`Failed to parse response: ${parseError.message}`);
      return { error: true, parseError: parseError.message };
    }
  } catch (error: any) {
    console.error('Error fetching page data:', error);
    return { error: true, message: error.message };
  }
}
