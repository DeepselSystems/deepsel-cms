import {Outlet, useLocation, useNavigate} from 'react-router-dom';
import useAuthentication from '../api/useAuthentication.js';
import {useEffect, useState, useMemo, memo} from 'react';
import {Preferences} from '@capacitor/preferences';
import trackingSettings from '../../constants/trackingSettings.js';
import SitePublicSettingsState from '../stores/SitePublicSettingsState.js';
import backendHost from '../../constants/backendHost.js';

/**
 * RequireAuth - Mandatory authentication guard for admin routes
 *
 * This component enforces strict authentication for admin panel routes. It:
 * - BLOCKS access to routes unless user is authenticated
 * - Redirects unauthenticated users to /admin/login with return URL
 * - Handles token validation and automatic re-authentication
 * - Manages admin session state and XRAY tracking
 *
 * Used by: Admin routes in App.jsx (pages, blog_posts, users, settings, etc.)
 *
 * Flow:
 * 1. Check if user is already authenticated in memory
 * 2. If not, attempt to load token from Capacitor Preferences
 * 3. Validate token with backend and restore user session
 * 4. If token invalid/missing, redirect to /admin/login?redirect=/admin/current-path
 * 5. Only render child routes after successful authentication
 *
 * Key features:
 * - Automatic token refresh and validation
 * - Proper redirect URL handling with /admin prefix
 * - Anonymous account rejection (signed_up check)
 * - Loading state during authentication check
 *
 * @component
 * @example
 * // In App.jsx admin routes
 * <Route element={<RequireAuth />}>
 *   <Route path="/pages" element={<PageList />} />
 *   <Route path="/blog_posts" element={<BlogPostList />} />
 * </Route>
 */
function RequireAuth() {
  const location = useLocation();
  const {
    user: currentUser,
    fetchUserData,
    saveUserData,
    login,
  } = useAuthentication();
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();
  const {settings: siteSettings, setSettings} = SitePublicSettingsState();

  const checkAuth = useMemo(
    () => async () => {
      try {
        let isAuthlessMode = siteSettings?.authless;

        // If site settings are not loaded, try to fetch them
        if (!siteSettings) {
          try {
            const response = await fetch(
              `${backendHost}/util/public_settings/1`
            );
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
              await login({username: 'authless', password: 'authless'});
            } catch (e) {
              console.error('Authless login failed', e);
            }
          }
          setInitialized(true);
          return;
        }

        if (!currentUser) {
          // get user data from storage
          const tokenResult = await Preferences.get({key: 'token'});
          const token = tokenResult.value;
          // Get the full path (basename is already handled by BrowserRouter)
          const fullPath = location.pathname + location.search;
          const searchParams = new URLSearchParams({
            redirect: fullPath,
          }).toString();
          const rejectLink = '/login?' + searchParams;

          if (token) {
            // found old token and user data, wait for fetch of user data
            // before deciding to reject or not
            try {
              const user = await fetchUserData(token);
              await saveUserData(user, token);

              if (!user.signed_up) {
                // user account is anonymous account, reject
                return navigate(rejectLink);
              }
            } catch (e) {
              console.error(e);
              // token is invalid, re-direct
              return navigate(rejectLink);
            }
          } else {
            // no token found, reject
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
      saveUserData,
      location,
      navigate,
      siteSettings,
      login,
      setSettings,
    ]
  );

  useEffect(() => {
    checkAuth();
  }, []);

  return initialized ? <Outlet /> : <div>Loading...</div>;
}

export default memo(RequireAuth);
