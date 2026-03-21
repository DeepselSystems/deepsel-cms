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

    // Navigate within the admin app
    // redirect is relative to the admin basename (e.g., "/pages", not "/admin/pages")
    // If it has /admin prefix (from older redirects or backend), strip it
    let targetPath = redirect ? decodeURIComponent(redirect) : '/pages';
    if (targetPath.startsWith('/admin/')) {
      targetPath = targetPath.substring('/admin'.length) || '/pages';
    } else if (targetPath.startsWith('/admin')) {
      targetPath = targetPath.substring('/admin'.length) || '/pages';
    }
    navigate(targetPath);
  }

  return <></>;
}
