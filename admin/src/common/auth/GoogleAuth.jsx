import { Preferences } from '@capacitor/preferences';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useQuery from '../hooks/useQuery.jsx';
import useAuthentication from '../api/useAuthentication.js';

export default function GoogleAuth() {
  const query = useQuery();
  const navigate = useNavigate();
  const { fetchUserData, saveUserData } = useAuthentication();

  useEffect(() => {
    storeAccessToken();
  }, []);

  async function storeAccessToken() {
    const accessToken = query.get('access_token');
    const redirect = query.get('redirect');

    if (accessToken) {
      try {
        // Fetch user data and store properly using the authentication system
        const userData = await fetchUserData(accessToken);
        await saveUserData(userData, accessToken);
      } catch (error) {
        console.error('Failed to fetch user data after Google auth:', error);
        // Fallback to just storing token
        await Preferences.set({
          key: 'token',
          value: accessToken,
        });
      }
    }

    // Navigate to the redirect URL if provided, otherwise go to admin home
    const redirectUrl = redirect ? decodeURIComponent(redirect) : '/admin/pages';

    // If redirect URL starts with /admin/, strip the /admin prefix for React Router
    // since we're already in the admin app context (basename="/admin")
    if (redirectUrl.startsWith('/admin/')) {
      const adminPath = redirectUrl.substring('/admin'.length) || '/pages';
      navigate(adminPath);
    } else if (redirectUrl.startsWith('/')) {
      // For website paths, use window.location.href to navigate outside admin context
      window.location.href = redirectUrl;
    } else {
      // For relative paths, use React Router navigate
      navigate(redirectUrl);
    }
  }

  return <></>;
}
