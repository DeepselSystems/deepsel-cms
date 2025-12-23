import { useCallback, useEffect, useMemo } from 'react';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import mantineTheme from './theme/mantineTheme.js';
import muiTheme from './theme/muiTheme.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import tz from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import './i18n.js';
import { useTranslation } from 'react-i18next';
import SitePublicSettingsState from './common/stores/SitePublicSettingsState.js';

dayjs.extend(utc);
dayjs.extend(tz);
dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.extend(customParseFormat);

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/tiptap/styles.css';
import '@mantine/charts/styles.css';
import './assets/css/global.css';
import './assets/css/tiptap-extension/youtube-jump-marks.css';
import './assets/css/tiptap-extension/prose-mirror-collapse.css';
import './assets/css/tiptap-extension/enhanced-image.css';
import './assets/css/tiptap-extension/embed-video.css';
import './assets/css/tiptap-extension/embed-audio.css';
import './assets/css/tiptap-extension/embed-files.css';
import { LocalstorageKey } from './constants/localstorage.js';
import useBrowserLanguages from './common/hooks/useBrowserLanguages.js';
import useEffectOnce from './common/hooks/useEffectOnce.js';

export default function ReactClient(props) {
  const { children, siteSettings } = props;
  const { i18n } = useTranslation();
  const { setSettings } = SitePublicSettingsState();
  const browserLanguages = useBrowserLanguages();

  /**
   * Initial path
   * @type {string}
   */
  const initialPath = useMemo(() => props.initialPath, [props.initialPath]);

  /**
   * Default site language
   * @type {Locale || null}
   */
  const defaultSiteLanguage = useMemo(
    () => props.siteSettings?.default_language || null,
    [props.siteSettings?.default_language],
  );

  /**
   * Available language for this page
   * @type {Array<Locale>}
   */
  const availableSiteLanguages = useMemo(
    () => props.siteSettings?.available_languages || [],
    [props.siteSettings?.available_languages],
  );

  /**
   * Get alternatives languages of this page
   * @type {Array<{slug: string, locale: Locale}>}
   */
  const languageAlternatives = useMemo(
    () => props.initialPageData?.language_alternatives || [],
    [props.initialPageData?.language_alternatives],
  );

  /**
   * Func to redirect to site with default language
   */
  const redirectToDefaultLanguageSite = useCallback(() => {
    if (
      defaultSiteLanguage &&
      languageAlternatives.find((o) => o.locale.iso_code === defaultSiteLanguage.iso_code)
    ) {
      location.href = `/${defaultSiteLanguage.iso_code}${initialPath}`;
    }
  }, [defaultSiteLanguage, initialPath, languageAlternatives]);

  /**
   * Initialize i18n language
   * Prioritize localstorage first, then default site language
   */
  useEffectOnce(() => {
    const i18NextLangStorage = localStorage.getItem(LocalstorageKey.I18NextLang);
    if (i18NextLangStorage) {
      if (availableSiteLanguages.find((o) => o.iso_code === i18NextLangStorage)) {
        i18n.changeLanguage(i18NextLangStorage).then();
      } else {
        if (defaultSiteLanguage) {
          localStorage.setItem(LocalstorageKey.I18NextLang, defaultSiteLanguage.iso_code);
          i18n.changeLanguage(defaultSiteLanguage.iso_code).then();
        }
      }
    }
  });

  /**
   * Initialize language site
   *
   * browser lang in site languages → set lang = browser lang
   * browser lang not in site languages → set lang = site default lang
   * cannot detect → set lang = site default lang
   */
  useEffectOnce(() => {
    // Get lang code in url
    const langCodeInPathRaw = location.href.split(location.origin)[1].split('/')[1];
    const langCodeInPath = availableSiteLanguages.find(
      (o) => o.iso_code.toLowerCase() === langCodeInPathRaw?.toLowerCase(),
    )?.iso_code;

    if (langCodeInPath) {
      // If url has the language code in url path, keeps everything
      i18n.changeLanguage(langCodeInPath).then();
    } else {
      // If the url does not have lang code, check saved lang in localstorage
      const i18NextLangStorage = localStorage.getItem(LocalstorageKey.I18NextLang);
      if (i18NextLangStorage) {
        // If localstorage has valid lang code, redirect site to that lang
        const languageAlternative = languageAlternatives.find(
          (o) => o.locale.iso_code === i18NextLangStorage,
        );
        if (languageAlternative && languageAlternative.locale.iso_code !== i18NextLangStorage) {
          location.href = `/${languageAlternative.locale.iso_code}${languageAlternative.slug}`;
        }
      } else {
        // If localstorage does not have lang code, move to check the browser languages
        let detectedSiteLanguage = null;
        for (const browserLanguage of browserLanguages) {
          const lowerCaseBrowserLanguage = browserLanguage.toLowerCase();
          detectedSiteLanguage = availableSiteLanguages.find((availableSiteLanguage) => {
            const lowerCaseIsoCode = availableSiteLanguage.iso_code.toLowerCase();
            return (
              lowerCaseIsoCode === lowerCaseBrowserLanguage ||
              lowerCaseIsoCode.includes(lowerCaseBrowserLanguage) ||
              lowerCaseBrowserLanguage.includes(lowerCaseIsoCode)
            );
          });
          if (detectedSiteLanguage) {
            break;
          }
        }

        // If browser lang is supported by site languages
        if (detectedSiteLanguage) {
          if (props.initialPageData) {
            const detectedLanguageAlternative = languageAlternatives.find(
              (languageAlternative) =>
                languageAlternative.locale.iso_code === detectedSiteLanguage.iso_code,
            );
            if (detectedLanguageAlternative) {
              location.href = `/${detectedLanguageAlternative.locale.iso_code}${detectedLanguageAlternative.slug}`;
            } else {
              redirectToDefaultLanguageSite();
            }
          } else {
            // If it doesn't have initialPageData, it is usually in admin pages
            i18n.changeLanguage(detectedSiteLanguage.iso_code).then();
          }
        } else {
          props.initialPageData && redirectToDefaultLanguageSite();
        }
      }
    }
  });

  /**
   * Detect i18n language change to update to localStorage
   */
  useEffect(() => {
    localStorage.setItem(LocalstorageKey.I18NextLang, i18n.language);
  }, [i18n.language]);

  useEffect(() => {
    // Initialize site settings state with initial data
    if (siteSettings) {
      setSettings(siteSettings);
    }
  }, [i18n, setSettings, siteSettings]);

  return (
    <MantineProvider theme={mantineTheme}>
      <ModalsProvider>
        <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}
