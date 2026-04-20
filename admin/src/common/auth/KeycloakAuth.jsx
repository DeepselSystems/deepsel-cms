import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useQuery from '../hooks/useQuery.jsx';
import useAuthentication from '../api/useAuthentication.js';
import { useBasename } from '../BasenameContext.js';
import BackendHostURLState from '../stores/BackendHostURLState.js';

export default function KeycloakAuth() {
  const query = useQuery();
  const navigate = useNavigate();
  const basename = useBasename();
  const { fetchUser } = useAuthentication();
  const [error, setError] = useState(null);

  useEffect(() => {
    handleAuth();
  }, []);

  async function handleAuth() {
    const code = query.get('code');
    const state = query.get('state');

    if (!code || !state) {
      setError('Missing authorization code');
      return;
    }

    try {
      const { backendHost } = BackendHostURLState.getState();

      // Exchange code for session via backend
      const response = await fetch(`${backendHost}/auth/keycloak/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code, state }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Authentication failed');
      }

      // Session cookie was set — fetch user data
      await fetchUser();

      // Navigate to admin
      const redirect = query.get('redirect');
      let targetPath = redirect ? decodeURIComponent(redirect) : '/pages';
      if (targetPath.startsWith(basename + '/')) {
        targetPath = targetPath.substring(basename.length) || '/pages';
      } else if (targetPath.startsWith(basename)) {
        targetPath = targetPath.substring(basename.length) || '/pages';
      }
      navigate(targetPath);
    } catch (err) {
      console.error('Keycloak auth failed:', err);
      setError(err.message);
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href={`${basename}/login`} className="text-blue-600 underline">
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Authenticating...</p>
    </div>
  );
}
