import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import useAuthentication from '../api/useAuthentication.js';
import { useEffect, useState, useMemo, memo } from 'react';
import trackingSettings from '../../constants/trackingSettings.js';
import SitePublicSettingsState from '../stores/SitePublicSettingsState.js';
import backendHost from '../../constants/backendHost.js';

/**
 * RequireAuth - Mandatory authentication guard for admin routes
 *
 * Uses httpOnly session cookies for authentication. Validates the session
 * by calling /user/util/me — if the cookie is valid the server returns
 * the user, otherwise 401.
 */
function RequireAuth() {
  const location = useLocation();
  const { user: currentUser, fetchUserData, login } = useAuthentication();
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();
  const { settings: siteSettings, setSettings } = SitePublicSettingsState();

  const checkAuth = useMemo(
    () => async () => {
      try {
        let isAuthlessMode = siteSettings?.authless;

        // If site settings are not loaded, try to fetch them
        if (!siteSettings) {
          try {
            const response = await fetch(`${backendHost}/util/public_settings/1`);
            if (response.ok) {
              const settings = await response.json();
              setSettings(settings);
              isAuthlessMode = settings?.authless;
            }
          } catch (e) {
            console.error('Failed to fetch site public settings', e);
          }
        }

        if (isAuthlessMode) {
          if (!currentUser) {
            try {
              await login({ username: 'authless', password: 'authless' });
            } catch (e) {
              console.error('Authless login failed', e);
            }
          }
          setInitialized(true);
          return;
        }

        if (!currentUser) {
          const fullPath = location.pathname + location.search;
          const searchParams = new URLSearchParams({
            redirect: fullPath,
          }).toString();
          const rejectLink = '/login?' + searchParams;

          try {
            // Validate session by fetching current user (cookie sent automatically)
            await fetchUserData();
          } catch (e) {
            // Session invalid or no session — redirect to login
            return navigate(rejectLink);
          }
        }

        // this depends on token being saved in local storage,
        // so we await all saveUserData calls
        if (trackingSettings.enableXRAY && window.XRAY) {
          window.XRAY.setCurrentUser(currentUser);
        }
      } finally {
        setInitialized(true);
      }
    },
    [
      currentUser,
      fetchUserData,
      location,
      navigate,
      siteSettings,
      login,
      setSettings,
    ],
  );

  useEffect(() => {
    checkAuth();
  }, []);

  return initialized ? <Outlet /> : <div>Loading...</div>;
}

export default memo(RequireAuth);
