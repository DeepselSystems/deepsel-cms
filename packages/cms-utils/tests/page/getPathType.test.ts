import { describe, expect, it } from 'vitest';
import { getPathType } from '../../src/page/getPathType';

describe('getPathType', () => {
  it('detects "search" as SearchResults', () => {
    const result = getPathType('search');
    expect(result).toEqual({ pathType: 'SearchResults' });
  });

  it('detects "search?q=hello" as SearchResults', () => {
    const result = getPathType('search?q=hello');
    expect(result).toEqual({ pathType: 'SearchResults' });
  });

  it('detects "search/" as SearchResults', () => {
    const result = getPathType('search/');
    expect(result).toEqual({ pathType: 'SearchResults' });
  });

  it('does not confuse similar paths like "searching"', () => {
    const result = getPathType('searching');
    expect(result).toEqual({ pathType: 'Page', pagination: undefined });
  });

  it('detects "/search" with leading slash as SearchResults', () => {
    const result = getPathType('/search');
    expect(result).toEqual({ pathType: 'SearchResults' });
  });
});
