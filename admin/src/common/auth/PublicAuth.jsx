import { Outlet } from 'react-router-dom';
import useAuthentication from '../api/useAuthentication.js';
import { useEffect, useMemo, memo } from 'react';
import { Preferences } from '@capacitor/preferences';

function PublicAuth() {
  const { user, fetchUserData, saveUserData, setUser } = useAuthentication();

  const initUserData = useMemo(
    () => async () => {
      if (!user) {
        // get user data from storage
        const userDataResult = await Preferences.get({ key: 'userData' });
        const tokenResult = await Preferences.get({ key: 'token' });
        let token, userData;

        // found old token and user data, save it first, then async update
        if (userDataResult.value && tokenResult.value) {
          token = tokenResult.value;
          try {
            userData = JSON.parse(userDataResult.value);
            saveUserData(userData, token);
          } catch {
            console.warn('userData invalid');
          }

          // now perform async update, meaning re-sync with server
          try {
            userData = await fetchUserData(token);
            await saveUserData(userData, token);
          } catch (e) {
            // token is invalid, re-init anon user or just wipe it
            console.error(e);
            await Promise.all([
              Preferences.remove({ key: 'token' }),
              Preferences.remove({ key: 'userData' }),
            ]);
            setUser(null);
          }
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
