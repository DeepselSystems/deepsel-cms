import { isValidLanguageCode } from './isValidLanguageCode';
import { getPathType } from './getPathType';
import type { PathType, Pagination } from './getPathType';

export interface SlugParseResult {
  lang?: string;
  path: string;
  pathType: PathType;
  pagination?: Pagination;
}

/**
 * Parses a slug to determine language and path
 */
export function parseSlug(slug: string | null): SlugParseResult {
  const slugParts = slug ? slug.split('/').filter(Boolean) : [];
  let lang: string | undefined;
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

  const { pathType, pagination } = getPathType(path);
  return { lang, path, pathType, pagination };
}
