import { describe, expect, it } from 'vitest';
import { parseSlug } from '../../src/page/parseSlug';

describe('parseSlug', () => {
  it('extracts language and the remaining path', () => {
    const result = parseSlug('en/blog/post-1');
    expect(result).toEqual({
      lang: 'en',
      path: '/blog/post-1',
      pathType: 'BlogPost',
      pagination: undefined,
    });
  });

  it('defaults to root path when only language is present', () => {
    const result = parseSlug('es');
    expect(result).toEqual({ lang: 'es', path: '/', pathType: 'Page', pagination: undefined });
  });

  it('treats slug without language as a raw path', () => {
    const result = parseSlug('about/contact');
    expect(result).toEqual({
      lang: undefined,
      path: 'about/contact',
      pathType: 'Page',
      pagination: undefined,
    });
  });

  it('handles empty or null input safely', () => {
    expect(parseSlug('')).toEqual({
      lang: undefined,
      path: '/',
      pathType: 'Page',
      pagination: undefined,
    });
    expect(parseSlug(null)).toEqual({
      lang: undefined,
      path: '/',
      pathType: 'Page',
      pagination: undefined,
    });
  });

  it('parses bare "search" slug as SearchResults without language', () => {
    expect(parseSlug('search')).toEqual({
      lang: undefined,
      path: 'search',
      pathType: 'SearchResults',
      pagination: undefined,
    });
  });

  it('parses "en/search" slug as SearchResults with language "en"', () => {
    expect(parseSlug('en/search')).toEqual({
      lang: 'en',
      path: '/search',
      pathType: 'SearchResults',
      pagination: undefined,
    });
  });

  it('parses "es/search" slug as SearchResults with language "es"', () => {
    expect(parseSlug('es/search')).toEqual({
      lang: 'es',
      path: '/search',
      pathType: 'SearchResults',
      pagination: undefined,
    });
  });
});
