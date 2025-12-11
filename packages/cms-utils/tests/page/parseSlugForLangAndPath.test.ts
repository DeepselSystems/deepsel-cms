import { describe, expect, it } from 'vitest';
import { parseSlugForLangAndPath } from '../../src/page/parseSlugForLangAndPath';

describe('parseSlugForLangAndPath', () => {
  it('extracts language and the remaining path', () => {
    const result = parseSlugForLangAndPath('en/blog/post-1');
    expect(result).toEqual({ lang: 'en', path: '/blog/post-1' });
  });

  it('defaults to root path when only language is present', () => {
    const result = parseSlugForLangAndPath('es');
    expect(result).toEqual({ lang: 'es', path: '/' });
  });

  it('treats slug without language as a raw path', () => {
    const result = parseSlugForLangAndPath('about/contact');
    expect(result).toEqual({ lang: null, path: '/about/contact' });
  });

  it('handles empty or null input safely', () => {
    expect(parseSlugForLangAndPath('')).toEqual({ lang: null, path: '/' });
    expect(parseSlugForLangAndPath(null)).toEqual({ lang: null, path: '/' });
  });
});
