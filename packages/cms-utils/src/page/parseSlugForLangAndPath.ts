import { isValidLanguageCode } from '../language';
import type { SlugParseResult } from './types';

/**
 * Parses a slug to determine language and path
 */
export function parseSlugForLangAndPath(slug: string | null): SlugParseResult {
  const slugParts = slug ? slug.split('/').filter(Boolean) : [];
  let lang = null;
  let path = '/';

  // Check if the first part is a valid language code
  if (slugParts.length > 0 && isValidLanguageCode(slugParts[0])) {
    lang = slugParts[0];
    // If there are more parts, join them as the path, otherwise keep root path
    if (slugParts.length > 1) {
      path = '/' + slugParts.slice(1).join('/');
    }
  } else {
    // No language in URL, use the path as is with a leading slash
    path = slugParts.length > 0 ? '/' + slugParts.join('/') : '/';
  }

  return { lang, path };
}
