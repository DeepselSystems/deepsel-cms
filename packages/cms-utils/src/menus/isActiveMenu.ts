import type { MenuItem } from './types.js';
import type { WebsiteData } from '../types.js';

// Check if a menu item should be marked as active
export const isActiveMenu = (menuItem: MenuItem, websiteData: WebsiteData) => {
  // return if not browser
  if (typeof window === 'undefined') {
    return false;
  }

  const location = window.location;

  const currentLang = websiteData.data.lang;
  let result;
  if (menuItem.url === '/') {
    result =
      location.pathname === '/' ||
      location.pathname === `/${currentLang}` ||
      location.pathname === `/${currentLang}/`;
  } else if (menuItem.url) {
    result =
      location.pathname === menuItem.url ||
      location.pathname === `/${currentLang}${menuItem.url}` ||
      location.pathname === `/${currentLang}${menuItem.url}/` ||
      location.pathname.startsWith(menuItem.url + '/') ||
      location.pathname.startsWith(`/${currentLang}${menuItem.url}/`);
  }
  return result ?? false;
};
