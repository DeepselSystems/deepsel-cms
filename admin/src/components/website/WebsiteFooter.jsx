import React from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import {Box, Image, Highlight} from '@mantine/core';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import SitePublicSettingsState from '../../common/stores/SitePublicSettingsState.js';
import {TranslationNamespace} from '../../constants/translation.js';

// List others of links
const OthersLinks = [
  {
    title: 'Start',
    url: '#',
  },
  {
    title: 'Docs',
    url: '#',
  },
  {
    title: 'Dossler',
    url: '#',
  },
];

/**
 * Render navigation list menu
 *
 * @type {React.NamedExoticComponent<{
 *   title: string
 *   menus: Array<{title: string, url: string}>
 * }>}
 */
const NavigationMenus = React.memo(({title, menus}) => {
  return (
    <>
      <Box>
        <Box
          component="h6"
          className="!mt-0 !mb-4 md:!mb-6 !text-xs !font-bold !uppercase !tracking-widest"
        >
          {title}
        </Box>
        <Box
          component="ul"
          className="space-y-4 md:space-y-6 text-sm font-semibold"
        >
          {menus.map((menuItem, index) => (
            <Box key={index} component="li" className="opacity-75">
              <Link to={menuItem.url}>{menuItem.title}</Link>
            </Box>
          ))}
        </Box>
      </Box>
    </>
  );
});
NavigationMenus.displayName = 'NavigationMenus';

/**
 * Render contact
 *
 * @type {React.NamedExoticComponent<object>}
 */
const Contact = React.memo(() => {
  // Translation
  const {t} = useTranslation(TranslationNamespace.Footer);

  return (
    <>
      <Box>
        <Box
          component="h6"
          className="!mt-0 !mb-4 md:!mb-6 !text-xs !font-bold !uppercase !tracking-widest"
        >
          {t('Contact')}
        </Box>
        <Highlight
          component="p"
          className="!text-sm opacity-75"
          highlight={[t('accepted by FOITT'), t('Legal information')]}
          highlightStyles={{
            textDecoration: 'underline',
            color: 'white',
            backgroundColor: 'inherit',
            WebkitBackgroundClip: 'text',
          }}
        >
          {t(
            'FooterContact.content',
            'Questions and concerns regarding this information offer are accepted by FOITT. Legal information'
          )}
        </Highlight>
      </Box>
    </>
  );
});
Contact.displayName = 'Contact';

/**
 * Website footer
 *
 * @returns {Element}
 * @constructor
 */
export default function WebsiteFooter() {
  // Translation
  const {t} = useTranslation(TranslationNamespace.Footer);

  // Get settings
  const {settings: siteSettings} = SitePublicSettingsState();

  // Get menu
  const menus = React.useMemo(
    () => siteSettings?.menus?.main || [],
    [siteSettings?.menus?.main]
  );

  /**
   * Current year
   *
   * @type {string}
   */
  const currentYear = React.useMemo(() => {
    return dayjs().format('YYYY');
  }, []);

  return (
    <Box
      component="footer"
      className={clsx(
        'bg-blue-pickled-bluewood text-white md:p-20 px-4 py-10 space-y-10 md:space-y-20'
      )}
    >
      <Box className="grid gap-10 grid-cols-1 md:grid-cols-2">
        {/*region information*/}
        <Box component="p" className="max-w-138 font-bold text-lg">
          {t(
            'Federal Office of Information Technology, Systems and Telecommunication FOITT - eIAM, in cooperation with the Federal Chancellery FCh, Digital Transformation and ICT Governance DTI.'
          )}
        </Box>
        {/*region information*/}

        {/*region navigation links*/}
        <Box className="grid gap-8 grid-cols-1 md:grid-cols-3">
          <NavigationMenus
            title={t('WebsiteFooter.menu', 'Menu')}
            menus={menus}
          ></NavigationMenus>
          <NavigationMenus
            title={t('WebsiteFooter.others', 'Others')}
            menus={OthersLinks}
          ></NavigationMenus>
          <Contact />
        </Box>
        {/*endregion navigation links*/}
      </Box>

      <Box className="grid gap-5 grid-cols-1 md:grid-cols-3 text-xs font-normal">
        <Box className="text-center md:text-left">
          <Box component="span">{currentYear}</Box>{' '}
          <Box component="span">{t('eIAM.')}</Box>
        </Box>
        <Box className="text-center">
          {t('WebsiteFooter.AllRightsReserved', 'All rights reserved')}
        </Box>
        <Box className="text-center md:text-end flex justify-center md:justify-end gap-6">
          <Link to="#">
            <Box className="w-6 h-6">
              <Image src="/images/social-icon/twitter.svg" alt="Twitter" />
            </Box>
          </Link>

          <Link to="#">
            <Box className="w-6 h-6">
              <Image src="/images/social-icon/dribbble.svg" alt="Dribbble" />
            </Box>
          </Link>

          <Link to="#">
            <Box className="w-6 h-6">
              <Image src="/images/social-icon/facebook.svg" alt="Facebook" />
            </Box>
          </Link>

          <Link to="#">
            <Box className="w-6 h-6">
              <Image src="/images/social-icon/instagram.svg" alt="Instagram" />
            </Box>
          </Link>
        </Box>
      </Box>
    </Box>
  );
}
