import type { MenuItem } from './types.js';
import type { WebsiteData } from '../types.js';

// Check if a menu item should be marked as active
export const isActiveMenu = (menuItem: MenuItem, websiteData: WebsiteData) => {
  const pathname = websiteData.pathname;
  if (!pathname) {
    return false;
  }

  const currentLang = websiteData.data.lang;
  let result;
  if (menuItem.url === '/') {
    result = pathname === '/' || pathname === `/${currentLang}` || pathname === `/${currentLang}/`;
  } else if (menuItem.url) {
    result =
      pathname === menuItem.url ||
      pathname === `/${currentLang}${menuItem.url}` ||
      pathname === `/${currentLang}${menuItem.url}/` ||
      pathname.startsWith(menuItem.url + '/') ||
      pathname.startsWith(`/${currentLang}${menuItem.url}/`);
  }
  return result ?? false;
};
