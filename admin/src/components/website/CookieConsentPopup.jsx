import React from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import {
  readLocalStorageValue,
  useDisclosure,
  useLocalStorage,
} from '@mantine/hooks';
import {Box} from '@mantine/core';
import {useTranslation} from 'react-i18next';
import {TranslationNamespace} from '../../constants/translation.js';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faX} from '@fortawesome/free-solid-svg-icons';
import useEffectOnce from '../../common/hooks/useEffectOnce.js';
import {LocalstorageKey} from '../../constants/localstorage.js';

// Number of days to mark cookie consent is expired
const DAYS_TO_EXPIRE = 15;

/**
 * Cookie consent popup
 *
 * @type {React.ForwardRefExoticComponent<
 * React.PropsWithoutRef<{
 *   open: () => void
 * }> &
 * React.RefAttributes<unknown>>}
 */
const CookieConsentPopup = React.forwardRef((props, ref) => {
  // Localstorage state
  const [, setCookieConsentCreatedAt] = useLocalStorage({
    key: LocalstorageKey.CookieConsentExpiredAt,
    defaultValue: null,
  });

  // Translation
  const {t} = useTranslation(TranslationNamespace.CookieConsent);

  // Visible state
  const [opened, actions] = useDisclosure(false);

  /**
   * Handle click to accept cookie
   *
   * @type {(function())|*}
   */
  const handleAccept = React.useCallback(() => {
    setCookieConsentCreatedAt(
      dayjs().add(DAYS_TO_EXPIRE, 'd').toDate().getTime()
    );
    const closePopup = actions.close;
    closePopup();
  }, [actions.close, setCookieConsentCreatedAt]);

  /**
   * Handle ref
   */
  React.useImperativeHandle(ref, () => ({
    open: () => {
      actions.open();
    },
  }));

  /**
   * Effect once to check current state
   */
  useEffectOnce(() => {
    // Check current state after a while
    setTimeout(() => {
      // Get cookie consent from localstorage
      const cookieConsentCreatedAt = readLocalStorageValue({
        key: LocalstorageKey.CookieConsentExpiredAt,
        defaultValue: null,
      });

      if (cookieConsentCreatedAt) {
        const cookieConsentCreatedAtDayObj = dayjs(cookieConsentCreatedAt);
        if (
          !cookieConsentCreatedAtDayObj.isValid() ||
          cookieConsentCreatedAtDayObj.isBefore(new Date())
        ) {
          actions.open();
        }
      } else {
        actions.open();
      }
    }, 1500);
  });

  return (
    <>
      <Box
        className={clsx(
          'bg-gray-zumthor text-blue-persian font-sans font-normal shadow py-10 px-4 md:p-10 w-full',
          'fixed bottom-0 right-0',
          'transition-transform duration-700 ease-in-out',
          {
            'translate-y-full': !opened,
          }
        )}
      >
        <Box className="grid grid-cols-12 gap-6">
          {/*region content*/}
          <Box className="col-span-12 md:col-span-7">
            {t(
              'CookieConsentPopup.content',
              'Damit wir unser Webangebot optimal auf Ihre Bedürfnisse ausrichten können, verwenden wir das Analysetool Matomo. Dabei wird Ihr Verhalten auf der Website in anonymisierter Form erfasst. Es werden also keine personenbezogenen Daten übermittelt oder gespeichert. Wenn Sie damit nicht einverstanden sind, können Sie die Datenerfassung durch Matomo unterbinden und diese Website trotzdem ohne Einschränkungen nutzen. Weitere Informationen dazu finden Sie auf der Seite Rechtliches.'
            )}
          </Box>
          {/*endregion content*/}

          {/*region action buttons*/}
          <Box className="col-span-12 md:col-span-5">
            <Box className="flex flex-wrap gap-4 md:gap-6 lg:gap-10 sm:justify-end">
              <Box>
                <button
                  className="flex gap-3 border px-4 md:px-6 py-2.5 cursor-pointer"
                  onClick={handleAccept}
                >
                  <Box component="span">
                    {t('CookieConsentPopup.acceptButton', 'Einverstanden')}
                  </Box>
                  <Box component="span">
                    <FontAwesomeIcon icon={faCheck} />
                  </Box>
                </button>
              </Box>
              <Box>
                <button
                  className="flex gap-3 py-2.5 cursor-pointer border border-transparent"
                  onClick={actions.close}
                >
                  <Box component="span" className="text-nowrap">
                    {t(
                      'CookieConsentPopup.refuseButton',
                      'Weiter ohne Datenerfassung'
                    )}
                  </Box>
                  <Box component="span">
                    <FontAwesomeIcon icon={faX} />
                  </Box>
                </button>
              </Box>
            </Box>
          </Box>
          {/*endregion action buttons*/}
        </Box>
      </Box>
    </>
  );
});

CookieConsentPopup.displayName = 'CookieConsentPopup';
export default CookieConsentPopup;
