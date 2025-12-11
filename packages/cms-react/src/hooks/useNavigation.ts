import { usePageData } from '../contexts/PageDataContext';
import { fetchPageData, parseSlugForLangAndPath } from '@deepsel/cms-utils';

export function useNavigation() {
  const { setPageData } = usePageData();

  const navigate = async (url: string) => {
    try {
      // Parse the URL to get language and path
      const { lang, path } = parseSlugForLangAndPath(url);

      // Fetch new page data
      const newPageData = await fetchPageData(lang, path);

      if ('error' in newPageData || 'notFound' in newPageData) {
        // Handle error or 404 - fallback to regular navigation
        console.warn('Failed to fetch page data, falling back to page reload');
        window.location.href = url;
        return;
      }

      // Update browser history
      window.history.pushState(null, '', url);

      // Update page data in store
      setPageData(newPageData);
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to regular navigation
      window.location.href = url;
    }
  };

  return { navigate };
}
