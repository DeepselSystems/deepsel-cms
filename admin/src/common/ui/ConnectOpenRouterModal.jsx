import { Modal } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import Button from './Button.jsx';
import { IconPlugConnected } from '@tabler/icons-react';
import { useAIProviderConfig } from '../AIProviderConfigContext.js';
import { useBasename } from '../BasenameContext.js';

// PKCE helpers
async function generatePKCE() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { codeVerifier, codeChallenge };
}

export default function ConnectOpenRouterModal({ opened, onClose }) {
  const { t } = useTranslation();
  const { oauthCallbackPath } = useAIProviderConfig();
  const basename = useBasename();

  const handleConnect = async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();

    // Store verifier for the callback page to use
    sessionStorage.setItem('openrouter_code_verifier', codeVerifier);

    const callbackUrl = `${window.location.origin}${basename}${oauthCallbackPath}`;
    const params = new URLSearchParams({
      callback_url: callbackUrl,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    window.open(
      `https://openrouter.ai/auth?${params.toString()}`,
      '_blank',
      'width=600,height=700',
    );
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<div className="font-semibold text-lg">{t('Connect AI Provider')}</div>}
      size={450}
      centered
    >
      <div className="py-4 text-center">
        <IconPlugConnected size={48} className="mx-auto mb-4 text-blue-500" />
        <p className="text-gray-700 mb-6">
          {t(
            'Connect your OpenRouter account to use AI-powered features like autocomplete, content generation, and translation.',
          )}
        </p>
        <Button onClick={handleConnect} className="w-full" size="lg">
          <IconPlugConnected size={18} className="mr-2" />
          {t('Connect OpenRouter')}
        </Button>
      </div>
    </Modal>
  );
}
