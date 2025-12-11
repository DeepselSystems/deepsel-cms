import {useState, useEffect, useRef, useMemo} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faChevronDown, faChevronRight} from '@fortawesome/free-solid-svg-icons';
import SitePublicSettingsState from '../../common/stores/SitePublicSettingsState.js';
import {parseSlugForLangAndPath} from '../../utils/pageUtils.js';
import WebsiteSearchInput from './WebsiteSearchInput.jsx';
import {TranslationNamespace} from '../../constants/translation.js';

export default function WebsiteHeader({currentPage = null}) {
  const {t, i18n} = useTranslation(TranslationNamespace.Header);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef(null);
  const {settings: siteSettings} = SitePublicSettingsState();
  const menus = useMemo(
    () => siteSettings?.menus?.main || [],
    [siteSettings?.menus?.main]
  );

  // Process menu items to use the correct translation based on current language
  const processedMenus = useMemo(() => {
    if (!menus || !menus.length) return [];

    function processMenuItem(menu) {
      const translation = menu.translations[i18n.language];
      if (!translation) {
        return null;
      }

      // Process children recursively and filter out null items
      const children =
        menu.children && menu.children.length > 0
          ? menu.children.map((child) => processMenuItem(child)).filter(Boolean)
          : [];

      return {
        id: menu.id,
        position: menu.position,
        title: translation?.title,
        url: translation?.url,
        open_in_new_tab: translation?.open_in_new_tab,
        children,
      };
    }

    return menus.map((menu) => processMenuItem(menu)).filter(Boolean);
  }, [menus, i18n.language]);

  const logoLink = useMemo(() => {
    // If current language is different from default, root link is /{language}
    return siteSettings?.default_language &&
      i18n.language !== siteSettings.default_language?.iso_code
      ? `/${i18n.language}`
      : '/';
  }, [siteSettings?.default_language?.iso_code, i18n.language]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(event.target)
      ) {
        setLangDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle language change
  const changeLanguage = (code) => {
    let targetPath = null;
    const {path: currentPath} = parseSlugForLangAndPath(location.pathname);

    // For pages: Use language_alternatives metadata to get language-specific slugs
    if (currentPage?.language_alternatives) {
      // Find the target language alternative
      const targetAlternative = currentPage.language_alternatives.find(
        (alt) => alt.locale?.iso_code === code
      );

      if (targetAlternative?.slug) {
        targetPath = targetAlternative.slug.startsWith('/')
          ? targetAlternative.slug
          : `/${targetAlternative.slug}`;
      }
    } else if (currentPage?.contents) {
      // Fallback to contents array (for frontend pages)
      const targetContent = currentPage.contents.find(
        (content) => content.locale?.iso_code === code
      );

      if (targetContent?.slug) {
        targetPath = targetContent.slug.startsWith('/')
          ? targetContent.slug
          : `/${targetContent.slug}`;
      }
    }

    // Fallback to current path if no specific content found
    if (!targetPath) {
      targetPath = currentPath;
    }

    // Build final URL
    const finalUrl =
      code !== siteSettings?.default_language?.iso_code
        ? `/${code}${targetPath}`
        : targetPath;

    i18n.changeLanguage(code);
    navigate(finalUrl);
    setLangDropdownOpen(false);
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Check if a menu item should be marked as active
  const isActive = (menuItem) => {
    let result;
    if (menuItem?.url === '/') {
      result =
        location.pathname === '/' ||
        location.pathname === `/${i18n.language}` ||
        location.pathname === `/${i18n.language}/`;
    } else {
      result =
        location.pathname === menuItem?.url ||
        location.pathname === `/${i18n.language}${menuItem?.url}` ||
        location.pathname === `/${i18n.language}${menuItem?.url}/`;
    }
    return result;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between sm:border-b border-gray-200">
        <div className="flex items-center gap-[10px] sm:gap-[16px] pl-4 md:px-4 w-full h-[50px] sm:h-[85px] transition-all duration-500">
          <Link
            to={logoLink}
            className="w-[43px] h-[58px] sm:w-[250px] sm:h-[80.6px] overflow-hidden block shrink-0"
          >
            {/* Logo or site name */}
            <div
              className="w-[250px] h-[80.6px] bg-cover bg-no-repeat transition-all duration-500"
              role="img"
              aria-label="eIAM"
            >
              <img
                src="/images/logo.svg"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </Link>
          <div className="border-l border-l-[#E5E4E2] h-[40px]"></div>
          <div className="text-[26px] font-light">
            {t('site_title', 'eIAM')}
          </div>
          <div className="font-light text-[18px] text-ellipsis hidden lg:block">
            {t(
              'site_subtitle',
              'Federal Office of Information Technology, Systems and Telecommunication & Federal Chancellery FCh, Digital Transformation and ICT Governance DTI'
            )}
          </div>
          <div className="ml-auto">
            <WebsiteSearchInput />
          </div>
        </div>

        <div className="flex items-center px-4">
          {/* Language Switcher - Desktop */}
          <div className="relative mr-4 hidden sm:block" ref={langDropdownRef}>
            <button
              className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 focus:outline-none cursor-pointer"
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            >
              <span className="uppercase">
                {i18n.language?.substring(0, 2)}
              </span>
              <span className="sr-only">
                {t('language_selector', 'Language')}
              </span>
              <FontAwesomeIcon
                icon={faChevronDown}
                className={`h-3 w-3 transform transition-transform duration-300 ${langDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Language Dropdown */}
            <div
              className={`absolute z-50 right-0 mt-2 w-32 origin-top transform overflow-hidden rounded border border-gray-200 bg-white shadow-lg transition-all duration-300 ${langDropdownOpen ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'}`}
            >
              {siteSettings?.available_languages?.map((lang) => (
                <button
                  key={lang.id}
                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 cursor-pointer ${i18n.language === lang.iso_code ? 'bg-gray-100 font-medium' : ''}`}
                  onClick={() => changeLanguage(lang.iso_code)}
                >
                  {lang?.iso_code?.substring(0, 2)?.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="flex flex-col items-center justify-center space-y-1.5 p-2 focus:outline-none sm:hidden"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            <span
              className={`h-0.5 w-6 bg-gray-800 transition-transform duration-300 ${mobileMenuOpen ? 'translate-y-2 rotate-45' : ''}`}
            ></span>
            <span
              className={`h-0.5 w-6 bg-gray-800 transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}
            ></span>
            <span
              className={`h-0.5 w-6 bg-gray-800 transition-transform duration-300 ${mobileMenuOpen ? '-translate-y-2 -rotate-45' : ''}`}
            ></span>
          </button>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="navigation hidden sm:block">
        <ul className="flex">
          {processedMenus.map((item) => (
            <li
              key={item.id}
              className={`group relative ${isActive(item) ? 'border-b-[3px] border-[#e53940] shadow-[0_2px_6px_-1px_#0000000d,0_5px_20px_-2px_#00000014]' : 'border-b-[3px] border-white hover:border-[#e53940] hover:shadow-[0_2px_6px_-1px_#0000000d,0_5px_20px_-2px_#00000014]'}`}
            >
              <Link
                to={item.url}
                className={`block px-4 py-3 text-gray-800 hover:text-primary-600 cursor-pointer ${isActive(item) ? 'font-medium' : ''}`}
                target={item.open_in_new_tab ? '_blank' : ''}
                rel={item.open_in_new_tab ? 'noopener noreferrer' : ''}
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile Navigation */}
      <div
        className={`navigation-mobile border-t border-t-[#dfe4e9] fixed inset-0 top-[50px] z-40 transform overflow-y-auto bg-white transition-transform duration-300 sm:hidden ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Mobile Language Switcher */}
        <div className="border-b border-gray-200 p-4">
          <div className="relative">
            <button
              className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 focus:outline-none cursor-pointer"
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            >
              <span className="uppercase">
                {i18n.language?.substring(0, 2)}
              </span>
              <span className="sr-only">
                {t('language_selector', 'Language')}
              </span>
              <FontAwesomeIcon
                icon={faChevronDown}
                className={`h-3 w-3 transform transition-transform duration-300 ${langDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Mobile Language Dropdown */}
            <div
              className={`absolute z-50 right-0 mt-2 w-32 origin-top transform overflow-hidden rounded border border-gray-200 bg-white shadow-lg transition-all duration-300 ${langDropdownOpen ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'}`}
            >
              {siteSettings?.available_languages?.map((lang) => (
                <button
                  key={lang.id}
                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 cursor-pointer ${i18n.language === lang.iso_code ? 'bg-gray-100 font-medium' : ''}`}
                  onClick={() => changeLanguage(lang.iso_code)}
                >
                  {lang?.iso_code?.substring(0, 2)?.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Menu Items */}
        <MobileNavigation
          items={processedMenus}
          isActive={isActive}
          setMobileMenuOpen={setMobileMenuOpen}
        />
      </div>
    </header>
  );
}

// Mobile Navigation Component with Accordion-style submenus
function MobileNavigation({items, isActive, setMobileMenuOpen}) {
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpanded = (itemId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <ul className="divide-y divide-gray-200">
      {items.map((item) => (
        <li key={item.id}>
          {item.children && item.children.length > 0 ? (
            <div>
              <div className="flex w-full items-center">
                <Link
                  to={item.url}
                  className="flex-grow px-4 py-3 text-left hover:bg-gray-50"
                  onClick={handleLinkClick}
                  target={item.open_in_new_tab ? '_blank' : ''}
                  rel={item.open_in_new_tab ? 'noopener noreferrer' : ''}
                >
                  <span
                    className={
                      isActive(item) ? 'font-medium text-primary-600' : ''
                    }
                  >
                    {item.title}
                  </span>
                </Link>
                <button
                  className="px-0 pr-4 py-3 text-gray-500 focus:outline-none"
                  onClick={() => toggleExpanded(item.id)}
                  aria-label="Toggle submenu"
                >
                  <FontAwesomeIcon
                    icon={
                      expandedItems[item.id] ? faChevronDown : faChevronRight
                    }
                    className="h-4 w-4"
                  />
                </button>
              </div>

              {expandedItems[item.id] && (
                <ul className="bg-gray-50 pl-4">
                  {item.children.map((child) => (
                    <li key={child.id}>
                      <Link
                        to={child.url}
                        className={`block border-b border-[#dfe4e9] w-full px-4 py-2 ${isActive(child.url) ? 'border-l-[3px] border-l-[#e53940] bg-[#f0f4f7] font-medium' : 'hover:border-l-[3px] hover:border-l-[#e53940] hover:bg-[#f0f4f7]'}`}
                        onClick={handleLinkClick}
                        target={child.open_in_new_tab ? '_blank' : ''}
                        rel={child.open_in_new_tab ? 'noopener noreferrer' : ''}
                      >
                        {child.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <Link
              to={item.url}
              className={`block w-full px-4 py-2 border-b border-[#dfe4e9] hover:bg-[#f0f4f7] hover:border-l-[3px] hover:border-l-[#e53940] ${isActive(item) ? 'border-l-[3px] border-l-[#e53940] font-medium' : ''}`}
              onClick={handleLinkClick}
              target={item.open_in_new_tab ? '_blank' : ''}
              rel={item.open_in_new_tab ? 'noopener noreferrer' : ''}
            >
              {item.title}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
