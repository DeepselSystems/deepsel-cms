import {Outlet, useLocation} from 'react-router-dom';
import useAuthentication from '../api/useAuthentication.js';
import {
  useEffect,
  useState,
  useMemo,
  memo,
  createContext,
  useContext,
} from 'react';
import {Preferences} from '@capacitor/preferences';
import trackingSettings from '../../constants/trackingSettings.js';
import SitePublicSettingsState from '../stores/SitePublicSettingsState.js';
import SpecialTemplateRenderer from '../../components/website/SpecialTemplateRenderer.jsx';
import backendHost from '../../constants/backendHost.js';

/**
 * ProtectedAuth - Conditional authentication guard for website routes
 *
 * This component provides flexible authentication for public website routes that
 * may or may not require login based on content settings. It:
 * - ALLOWS access to routes without authentication by default
 * - Attempts to restore user session if tokens exist
 * - Provides context for child components to signal authentication requirements
 * - Redirects to login only when content explicitly requires it
 *
 * Used by: Website routes in Website.jsx (blog posts, pages, search, forms)
 *
 * Flow:
 * 1. Always allows initial access to routes (no blocking)
 * 2. Attempts to restore authentication from stored tokens
 * 3. Provides setRequiresLogin() context to child components
 * 4. When child calls setRequiresLogin(true) AND user not authenticated:
 *    → Redirects to /admin/login?redirect=/current-website-path
 * 5. Child components check their data for require_login flag
 *
 * Key differences from RequireAuth:
 * - Non-blocking: Allows access first, checks requirements after
 * - Content-driven: Authentication requirement comes from content data
 * - Graceful degradation: Invalid tokens don't block access
 * - Website-focused: Redirects preserve website URLs for return
 *
 * @component
 * @example
 * // In Website.jsx
 * <Route element={<ProtectedAuth />}>
 *   <Route path="/blog/:slug" element={<WebsiteBlogPost />} />
 *   <Route path="/search" element={<SearchResultPage />} />
 * </Route>
 *
 * // In child component
 * function WebsiteBlogPost() {
 *   const {setRequiresLogin} = useProtectedAuth();
 *
 *   useEffect(() => {
 *     if (blogPost.require_login && !user) {
 *       setRequiresLogin(true); // Triggers redirect to login
 *     }
 *   }, [blogPost, user]);
 * }
 */
function ProtectedAuth() {
  const location = useLocation();
  const {
    user: currentUser,
    fetchUserData,
    saveUserData,
    login,
  } = useAuthentication();
  const [initialized, setInitialized] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const {settings: siteSettings, setSettings} = SitePublicSettingsState();

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
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

        if (isAuthlessMode && !currentUser) {
          try {
            await login({username: 'authless', password: 'authless'});
          } catch (e) {
            console.error('Authless login failed', e);
          }
        } else if (!currentUser) {
          // Try to get user data from storage if available, but don't require it
          const tokenResult = await Preferences.get({key: 'token'});
          const token = tokenResult.value;

          if (token) {
            try {
              const user = await fetchUserData(token);
              if (!cancelled) {
                await saveUserData(user, token);
              }
            } catch (e) {
              console.warn('Token invalid, continuing as unauthenticated:', e);
              if (!cancelled) {
                // Clear invalid token
                await Promise.all([
                  Preferences.remove({key: 'token'}),
                  Preferences.remove({key: 'userData'}),
                ]);
              }
            }
          }
        }

        // Set up tracking if user is authenticated
        if (
          !cancelled &&
          currentUser &&
          trackingSettings.enableXRAY &&
          window.XRAY
        ) {
          window.XRAY.setCurrentUser(currentUser);
        }
      } finally {
        if (!cancelled) {
          setInitialized(true);
        }
      }
    };

    initAuth();

    return () => {
      cancelled = true;
    };
  }, [
    currentUser,
    fetchUserData,
    saveUserData,
    login,
    siteSettings,
    setSettings,
  ]);

  useEffect(() => {
    if (currentUser && requiresLogin) {
      setRequiresLogin(false);
    }
  }, [currentUser, requiresLogin]);

  // Check if authless mode is enabled in site settings
  const isAuthlessMode = siteSettings?.authless;

  // Provide a way for child components to signal if they require login
  const contextValue = useMemo(
    () => ({
      setRequiresLogin,
      requiresLogin,
      redirectPath: location.pathname,
    }),
    [setRequiresLogin, requiresLogin, location.pathname]
  );

  if (!initialized) {
    return <div>Loading...</div>;
  }

  return (
    <ProtectedAuthContext.Provider value={contextValue}>
      {requiresLogin && !currentUser && !isAuthlessMode ? (
        <SpecialTemplateRenderer
          templateKey="login"
          siteSettingsOverride={siteSettings}
          fallback={
            <div className="min-h-screen flex items-center justify-center p-8 text-center">
              <div>
                <h1 className="text-3xl font-semibold mb-2">Login Required</h1>
                <p className="text-gray-600">Please log in to continue.</p>
              </div>
            </div>
          }
        />
      ) : (
        <Outlet />
      )}
    </ProtectedAuthContext.Provider>
  );
}

// Context for child components to communicate authentication requirements
const ProtectedAuthContext = createContext({});

/**
 * useProtectedAuth - Hook for components to signal authentication requirements
 *
 * Provides access to ProtectedAuth context, allowing child components to
 * communicate when they need authentication. Used by website components
 * that have content-based authentication requirements.
 *
 * @returns {Object} Context object with authentication control functions
 * @returns {Function} returns.setRequiresLogin - Call with true to trigger login redirect
 *
 * @example
 * function BlogPost() {
 *   const {setRequiresLogin} = useProtectedAuth();
 *   const {user} = useAuthentication();
 *
 *   useEffect(() => {
 *     // Check if this specific blog post requires authentication
 *     if (blogPostData?.require_login && !user) {
 *       setRequiresLogin(true); // Will redirect to login
 *     }
 *   }, [blogPostData, user, setRequiresLogin]);
 * }
 *
 * @hook
 */
export const useProtectedAuth = () => useContext(ProtectedAuthContext);

export default memo(ProtectedAuth);
