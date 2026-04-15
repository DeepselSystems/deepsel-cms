import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BackendHostURLState from '../../../common/stores/BackendHostURLState.js';
import OrganizationIdState from '../../../common/stores/OrganizationIdState.js';
import SitePublicSettingsState from '../../../common/stores/SitePublicSettingsState.js';
import NotificationState from '../../../common/stores/NotificationState.js';

export default function OpenRouterCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    const codeVerifier = sessionStorage.getItem('openrouter_code_verifier');
    sessionStorage.removeItem('openrouter_code_verifier');

    if (!code) {
      setStatus('error');
      return;
    }

    const exchangeCode = async () => {
      try {
        const { backendHost } = BackendHostURLState.getState();
        const { organizationId } = OrganizationIdState.getState();

        const response = await fetch(`${backendHost}/openrouter/exchange-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            code,
            organization_id: organizationId,
            code_verifier: codeVerifier || undefined,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || 'Exchange failed');
        }

        // Refresh site settings
        const settingsRes = await fetch(`${backendHost}/util/public_settings/${organizationId}`, {
          credentials: 'include',
        });
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          SitePublicSettingsState.getState().setSettings(data);
        }

        NotificationState.getState().notify({
          message: t('OpenRouter connected successfully!'),
          type: 'success',
        });

        setStatus('success');
        navigate('/site-settings');
      } catch (err) {
        console.error('OpenRouter exchange failed:', err);
        NotificationState.getState().notify({
          message: err.message || t('Failed to connect OpenRouter'),
          type: 'error',
        });
        setStatus('error');
        setTimeout(() => navigate('/site-settings'), 2000);
      }
    };

    exchangeCode();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">{t('Connecting OpenRouter...')}</p>
          </>
        )}
        {status === 'error' && (
          <p className="text-red-600">{t('Failed to connect. Redirecting...')}</p>
        )}
        {status === 'success' && <p className="text-green-600">{t('Connected! Redirecting...')}</p>}
      </div>
    </div>
  );
}
