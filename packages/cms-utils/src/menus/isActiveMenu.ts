import type { MenuItem } from './types.js';
import type { WebsiteData } from '../types.js';

// Check if a menu item should be marked as active
export const isActiveMenu = (menuItem: MenuItem, websiteData: WebsiteData) => {
  const pathname = websiteData.pathname;
  if (!pathname) {
    return false;
  }

  const currentLang = websiteData.data.lang;
  const isMatch = (url: string) => {
    const p = pathname.replace(/\/$/, '') || '/';
    const u = url.replace(/\/$/, '') || '/';
    return p === u || p.startsWith(u + '/');
  };

  let result = false;
  if (menuItem.url) {
    result =
      isMatch(menuItem.url) ||
      isMatch(`/${currentLang}${menuItem.url}`);
  }

  // Also mark parent active if any child matches
  if (!result && menuItem.children?.length) {
    result = menuItem.children.some((child) => {
      if (!child.url) return false;
      return isMatch(child.url) || isMatch(`/${currentLang}${child.url}`);
    });
  }

  return result;
};
