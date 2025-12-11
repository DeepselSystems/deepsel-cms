import React from 'react';
import clsx from 'clsx';
import {Box, Input} from '@mantine/core';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faSearch} from '@fortawesome/free-solid-svg-icons';
import {useTranslation} from 'react-i18next';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {TranslationNamespace} from '../../constants/translation.js';
import {QueryParamKey} from '../../constants/queryParams.js';
import useEffectOnce from '../../common/hooks/useEffectOnce.js';
// Tailwind default breakpoints (static to avoid Node.js dependencies)
const defaultTheme = {
  screens: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};
import {useViewportSize} from '@mantine/hooks';

/**
 * Search input, using for website pages
 *
 * @type {React.ForwardRefExoticComponent<
 * React.PropsWithoutRef<{
 *   className: string
 * }> &
 * React.RefAttributes<unknown>>}
 */
const WebsiteSearchInput = React.forwardRef(({className}, ref) => {
  // Get input id
  const inputId = React.useId();

  // Translation
  const {t, i18n} = useTranslation(TranslationNamespace.Header);

  // Navigate
  const navigate = useNavigate();

  // Get viewport size
  const {width: viewportWidth} = useViewportSize();

  /**
   * Whether current screen with is under md (tailwind breakpoint)
   * @type {boolean}
   */
  const isUnderMd = React.useMemo(() => {
    const widthOfMd = +defaultTheme.screens.md.replace('rem', '');
    if (isNaN(widthOfMd)) {
      return false;
    } else {
      return viewportWidth < widthOfMd * 16;
    }
  }, [viewportWidth]);

  // Search bar expansion
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Search str state
  const [searchContent, setSearchContent] = React.useState('');

  // Query params
  const [searchParams] = useSearchParams();

  /**
   * Handle search
   *
   * @type {(function())|*}
   */
  const handleSearch = React.useCallback(() => {
    if (searchContent.trim()) {
      // Get current language
      const currentLang = i18n.language || 'en';

      // Navigate to language-specific search results page with search query (always include language prefix)
      const searchPath = `/${currentLang}/search?${QueryParamKey.SearchQuery}=${encodeURIComponent(searchContent.trim())}`;

      navigate(searchPath);
    }
  }, [navigate, searchContent, i18n.language]);

  /**
   * Handle ref
   */
  React.useImperativeHandle(ref, () => ({}));

  /**
   * Use effect to detect screen width to expand the search input
   */
  React.useEffect(() => {
    setIsExpanded(!isUnderMd);
  }, [isUnderMd]);

  /**
   * Use effect once to initialize search query value to input
   */
  useEffectOnce(() => {
    setSearchContent(searchParams.get(QueryParamKey.SearchQuery) || '');
  });

  return (
    <>
      <Box className={clsx('flex flex-row-reverse', className)}>
        {isUnderMd && (
          <button
            onClick={() => setIsExpanded(true)}
            className={clsx('cursor-pointer transition-all w-auto', {
              '!w-0 opacity-0': isExpanded,
            })}
          >
            <FontAwesomeIcon icon={faSearch} className="text-gray-chateau-2" />
          </button>
        )}

        <Input
          id={inputId}
          ref={ref}
          className={clsx('!w-0 !opacity-0 overflow-hidden transition-all', {
            '!w-32 md:!w-40 !opacity-100': isExpanded,
          })}
          classNames={{
            input: '!rounded-none !border-gray-athens-gray',
          }}
          maxLength={100}
          placeholder={t('search', 'Search')}
          leftSection={<FontAwesomeIcon icon={faSearch} />}
          value={searchContent}
          onChange={({target: {value}}) => setSearchContent(value)}
          onKeyUp={(event) => {
            if (event.key === 'Enter') {
              handleSearch();
            }
          }}
          leftSectionPointerEvents="auto"
          leftSectionProps={{
            ...(isUnderMd && {
              className: clsx('cursor-pointer !text-gray-chateau-2'),
              onClick: () => {
                setIsExpanded(() => false);
              },
            }),
          }}
        />
      </Box>
    </>
  );
});

WebsiteSearchInput.displayName = 'WebsiteSearchInput';

export default WebsiteSearchInput;
