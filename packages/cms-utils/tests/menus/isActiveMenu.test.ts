// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from 'vitest';
import { isActiveMenu } from '../../src/menus/isActiveMenu';
import type { MenuItem } from '../../src/menus/types';
import type { WebsiteData } from '../../src/types';

function makeMenuItem(url: string): MenuItem {
  return { id: 1, title: 'Test', url, children: [], position: 0, open_in_new_tab: false };
}

function makeWebsiteData(lang?: string): WebsiteData {
  return {
    type: 'Page',
    data: { lang, public_settings: {} } as any,
  };
}

function setPathname(pathname: string) {
  Object.defineProperty(window, 'location', {
    value: { pathname },
    writable: true,
    configurable: true,
  });
}

describe('isActiveMenu', () => {
  beforeEach(() => {
    setPathname('/');
  });

  it('matches root URL exactly', () => {
    setPathname('/');
    expect(isActiveMenu(makeMenuItem('/'), makeWebsiteData())).toBe(true);
  });

  it('matches root with language prefix', () => {
    setPathname('/en');
    expect(isActiveMenu(makeMenuItem('/'), makeWebsiteData('en'))).toBe(true);
  });

  it('matches root with language prefix and trailing slash', () => {
    setPathname('/en/');
    expect(isActiveMenu(makeMenuItem('/'), makeWebsiteData('en'))).toBe(true);
  });

  it('does not match root when on another page', () => {
    setPathname('/about');
    expect(isActiveMenu(makeMenuItem('/'), makeWebsiteData())).toBe(false);
  });

  it('matches non-root URL exactly', () => {
    setPathname('/about');
    expect(isActiveMenu(makeMenuItem('/about'), makeWebsiteData())).toBe(true);
  });

  it('matches non-root URL with language prefix', () => {
    setPathname('/en/about');
    expect(isActiveMenu(makeMenuItem('/about'), makeWebsiteData('en'))).toBe(true);
  });

  it('matches child route via prefix — /blog active on /blog/post', () => {
    setPathname('/blog/my-post');
    expect(isActiveMenu(makeMenuItem('/blog'), makeWebsiteData())).toBe(true);
  });

  it('matches child route with language prefix', () => {
    setPathname('/en/blog/my-post');
    expect(isActiveMenu(makeMenuItem('/blog'), makeWebsiteData('en'))).toBe(true);
  });

  it('does not false-match prefix — /bl should not match /blog', () => {
    setPathname('/blog');
    expect(isActiveMenu(makeMenuItem('/bl'), makeWebsiteData())).toBe(false);
  });

  it('does not match unrelated URL', () => {
    setPathname('/contact');
    expect(isActiveMenu(makeMenuItem('/about'), makeWebsiteData())).toBe(false);
  });

  it('handles null URL gracefully', () => {
    setPathname('/about');
    expect(isActiveMenu(makeMenuItem(null as never), makeWebsiteData())).toBe(false);
  });
});
