import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconCheck, IconX } from '@tabler/icons-react';

/**
 * OpenRouter OAuth callback page.
 *
 * Runs inside the popup window opened by ConnectOpenRouterModal.
 * Sends the auth code back to the opener window via postMessage,
 * then closes itself.
 */
export default function OpenRouterCallback() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      setStatus('error');
      return;
    }

    // Send code to the opener window (the admin page that opened the popup)
    if (window.opener) {
      window.opener.postMessage(
        { type: 'OPENROUTER_AUTH_CODE', code },
        window.location.origin,
      );
      setStatus('success');
      // Close popup after short delay so user sees success
      setTimeout(() => window.close(), 1500);
    } else {
      // Fallback: if no opener (e.g. opened directly), show manual instructions
      setStatus('no-opener');
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-sm mx-4">
        {status === 'processing' && (
          <>
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600 font-medium">{t('Connecting...')}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconCheck size={24} className="text-green-600" />
            </div>
            <p className="text-green-700 font-semibold text-lg mb-1">{t('Connected!')}</p>
            <p className="text-gray-500 text-sm">{t('This window will close automatically.')}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconX size={24} className="text-red-600" />
            </div>
            <p className="text-red-700 font-semibold">{t('Authorization failed')}</p>
            <p className="text-gray-500 text-sm mt-1">{t('No authorization code received. Please try again.')}</p>
          </>
        )}
        {status === 'no-opener' && (
          <>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconCheck size={24} className="text-yellow-600" />
            </div>
            <p className="text-gray-700 font-semibold">{t('Authorization received')}</p>
            <p className="text-gray-500 text-sm mt-1">{t('Please close this window and return to the admin panel.')}</p>
          </>
        )}
      </div>
    </div>
  );
}
