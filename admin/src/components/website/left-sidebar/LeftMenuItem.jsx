import {useState, useRef, useEffect, useMemo} from 'react';
import linkIsCurrentPage from '../../../common/utils/linkIsCurrentPage';
import clsx from 'clsx';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import SitePublicSettingsState from '../../../common/stores/SitePublicSettingsState.js';

// Check if a menu item or any of its children is active/current page
const hasChildActive = (
  menuItem,
  currentLanguage,
  defaultLanguage,
  windowHref
) => {
  const translation = menuItem.translations?.[currentLanguage];
  if (!translation) {
    return false;
  }
  // Check if the current menu item is active
  if (
    linkIsCurrentPage(
      translation.url,
      currentLanguage,
      defaultLanguage,
      windowHref
    )
  ) {
    return true;
  }

  // Check if any children are active (recursive)
  if (menuItem.children && menuItem.children.length > 0) {
    return menuItem.children.some((child) =>
      hasChildActive(child, currentLanguage, defaultLanguage, windowHref)
    );
  }

  return false;
};

export default function LeftMenuItem({menu, index}) {
  const {i18n} = useTranslation();
  const currentLanguage = i18n.language;
  const {settings} = SitePublicSettingsState();
  const defaultLanguage = settings?.default_language?.iso_code;
  const hasChildren = menu.children && menu.children.length > 0;
  const windowHref = window.location.href;

  const hasActiveChild = useMemo(
    () =>
      hasChildren &&
      menu.children.some((child) =>
        hasChildActive(child, currentLanguage, defaultLanguage, windowHref)
      ),
    [hasChildren, menu.children, currentLanguage, defaultLanguage, windowHref]
  );
  const translation = menu.translations?.[currentLanguage];
  const isActive = useMemo(
    () =>
      linkIsCurrentPage(
        translation?.url,
        currentLanguage,
        defaultLanguage,
        windowHref
      ),
    [translation?.url, currentLanguage, defaultLanguage, windowHref]
  );

  // Local state for this specific menu item only - initialize to open if it has an active child
  const [isOpen, setIsOpen] = useState(hasActiveChild);

  // Refs for animation elements
  const caretRef = useRef(null);
  const contentRef = useRef(null);

  // Handle animations with useEffect
  useEffect(() => {
    if (caretRef.current) {
      caretRef.current.style.transition = 'transform 300ms ease';
      caretRef.current.style.transform = isOpen
        ? 'rotate(90deg)'
        : 'rotate(0deg)';
    }

    if (contentRef.current && hasChildren) {
      if (isOpen) {
        // Get the scroll height to use for max-height
        const height = contentRef.current.scrollHeight;
        contentRef.current.style.maxHeight = `${height}px`;
        contentRef.current.style.opacity = '1';
      } else {
        contentRef.current.style.maxHeight = '0px';
        contentRef.current.style.opacity = '0';
      }
    }
  }, [isOpen, hasChildren]);

  // Toggle this specific menu item only
  const toggleOpen = (e) => {
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  if (!translation) {
    return null;
  }

  return (
    <div className="border-b border-gray-aqua-haze">
      <div
        className={clsx(
          'flex items-center justify-between transition-all border-l-4',
          isActive
            ? 'bg-gray-aqua-haze text-primary-main border-primary-main'
            : hasActiveChild
              ? 'bg-gray-athens-gray text-primary-main border-primary-main'
              : 'hover:bg-gray-aqua-haze border-white hover:border-primary-main hover:translate-x-1'
        )}
      >
        <Link
          to={translation?.url}
          className={clsx(
            'flex-1 px-2 !py-4 block text-secondary-text hover:!text-primary-main hover:!no-underline !text-base',
            isActive || hasActiveChild ? '!text-primary-main' : ''
          )}
        >
          <div className="font-medium">{translation?.title}</div>
        </Link>

        {hasChildren && (
          <button onClick={toggleOpen} className="px-3 py-4 focus:outline-none">
            <svg
              ref={caretRef}
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>

      {hasChildren && (
        <div
          ref={contentRef}
          style={{
            overflow: 'hidden',
            maxHeight: '0px',
            opacity: '0',
            transition:
              'max-height 300ms ease-in-out, opacity 300ms ease-in-out',
          }}
        >
          <div className="pl-4">
            {menu.children.map((childMenu, childIndex) => (
              <LeftMenuItem
                key={childIndex}
                menu={childMenu}
                index={`${index}-${childIndex}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
