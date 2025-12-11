import React from 'react';
import LeftMenuItem from './LeftMenuItem.jsx';
import linkIsCurrentPage from '../../../common/utils/linkIsCurrentPage.js';
import SitePublicSettingsState from '../../../common/stores/SitePublicSettingsState.js';
import {useTranslation} from 'react-i18next';

/**
 * Recursively checks if the given menu or any of its child menus is currently active.
 *
 * @param {AppMenu} menu
 * @return {boolean}
 */
const hasActivatedMenu = (
  menu,
  currentLanguage,
  defaultLanguage,
  windowHref
) => {
  const translation = menu.translations?.[currentLanguage];
  if (!translation) {
    return false;
  }
  const url = translation.url;
  if (linkIsCurrentPage(url, currentLanguage, defaultLanguage, windowHref)) {
    return true;
  } else {
    // Check deeper levels
    for (const menuItem of menu.children || []) {
      if (
        hasActivatedMenu(menuItem, currentLanguage, defaultLanguage, windowHref)
      ) {
        return true;
      }
    }

    // If no activated menu found
    return false;
  }
};

export default function LeftSidebar() {
  const {settings} = SitePublicSettingsState();
  const menus = settings?.menus?.main;
  const {i18n} = useTranslation();
  const currentLanguage = i18n.language;
  const defaultLanguage = settings?.default_language?.iso_code;
  const windowHref = window.location.href;

  const processedMenus = menus
    ? React.useMemo(() => {
        for (const menu of menus) {
          if (
            hasActivatedMenu(menu, currentLanguage, defaultLanguage, windowHref)
          ) {
            return menu.children || [];
          }
        }
        return [];
      }, [menus, currentLanguage, defaultLanguage, windowHref])
    : [];

  if (!processedMenus.length) {
    return null;
  }

  return (
    <nav className="left-sidebar w-[250px] hidden lg:block">
      {processedMenus.map((menu, index) => (
        <LeftMenuItem key={index} menu={menu} index={index} />
      ))}
    </nav>
  );
}
