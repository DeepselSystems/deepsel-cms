import { describe, expect, it } from 'vitest';
import { getPathType } from '../../src/page/getPathType';

describe('getPathType', () => {
  describe('SearchResults', () => {
    it('returns SearchResults for exact "search"', () => {
      expect(getPathType('search')).toEqual({ pathType: 'SearchResults' });
    });

    it('returns SearchResults for "search?q=hello"', () => {
      expect(getPathType('search?q=hello')).toEqual({ pathType: 'SearchResults' });
    });

    it('returns SearchResults for "search/something"', () => {
      expect(getPathType('search/something')).toEqual({ pathType: 'SearchResults' });
    });

    it('returns SearchResults for "/search" (leading slash stripped)', () => {
      expect(getPathType('/search')).toEqual({ pathType: 'SearchResults' });
    });
  });

  describe('non-search paths', () => {
    it('returns BlogList for "blog"', () => {
      expect(getPathType('blog')).toEqual({ pathType: 'BlogList', pagination: undefined });
    });

    it('returns Page for "searching" (not exactly "search")', () => {
      expect(getPathType('searching')).toEqual({ pathType: 'Page', pagination: undefined });
    });
  });
});
