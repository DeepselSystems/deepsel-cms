import { Outlet } from 'react-router-dom';
import useAuthentication from '../api/useAuthentication.js';
import { useEffect, useMemo, memo } from 'react';
import { Preferences } from '@capacitor/preferences';

function PublicAuth() {
  const { user, fetchUserData, saveUserData, setUser } = useAuthentication();

  const initUserData = useMemo(
    () => async () => {
      if (!user) {
        // Try to restore user from session cookie by calling the server
        try {
          const userData = await fetchUserData();
          await saveUserData(userData);
        } catch {
          // No valid session — clear any stale local data
          await Preferences.remove({ key: 'userData' });
          setUser(null);
        }
      }
    },
    [user, fetchUserData, saveUserData, setUser],
  );

  useEffect(() => {
    initUserData();
  }, []);

  return <Outlet />;
}

export default memo(PublicAuth);
