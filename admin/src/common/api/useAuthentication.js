import { useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import backendHost from '../../constants/backendHost.js';
import UserState from '../stores/UserState.js';
import { Device } from '@capacitor/device';
import { useNetwork } from '@mantine/hooks';
import { useLocation } from 'react-router-dom';
import { useDeviceData } from 'react-device-detect';
import OrganizationIdState from '../stores/OrganizationIdState.js';
import { v4 as uuidv4 } from 'uuid';
import { setCookie, removeCookie } from '../utils/cookieUtils.js';

export default function useAuthentication() {
  const { user, setUser } = UserState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const network = useNetwork();
  const location = useLocation();
  const deviceData = useDeviceData();
  const { organizationId, setOrganizationId } = OrganizationIdState();

  async function saveUserData(userData, token) {
    setUser({ ...userData, token });

    // Store token in cookies for SSR access
    setCookie('token', token, 30);

    return Promise.all([
      Preferences.set({
        key: 'userData',
        value: JSON.stringify(userData),
      }),
      Preferences.set({
        key: 'token',
        value: token,
      }),
    ]);
  }

  async function initUser() {
    let deviceInfo = await Device.getInfo();
    deviceInfo = {
      ...deviceInfo,
      location,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      network,
      os_version: deviceInfo.osVersion === 'unknown' ? deviceData.os.name : deviceInfo.osVersion,
      browser: deviceData.browser,
      cpu: deviceData.cpu,
    };

    // Get or generate anonymousId
    let anonymousId = (await Preferences.get({ key: 'anonymousId' })).value;
    if (!anonymousId) {
      anonymousId = uuidv4();
      await Preferences.set({ key: 'anonymousId', value: anonymousId });
    }

    const res = await fetch(`${backendHost}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_info: deviceInfo,
        organization_id: user?.organization_id || organizationId,
        anonymous_id: anonymousId,
      }),
    });
    return res.json();
  }

  async function fetchUserData(token) {
    const response = await fetch(`${backendHost}/user/util/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status !== 200) {
      const { detail } = await response.json();
      setError(detail);
      throw new Error(detail);
    }
    return response.json();
  }

  async function fetchUser(token = null) {
    const userToken = token || user?.token;
    const userData = await fetchUserData(userToken);
    saveUserData(userData, userToken);
  }

  async function login({ username, password, otp = '' }) {
    try {
      setLoading(true);
      const encodedUsername = encodeURIComponent(username);
      const encodedPassword = encodeURIComponent(password);
      const response = await fetch(`${backendHost}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodedUsername}&password=${encodedPassword}&otp=${otp}`,
      });

      if (response.status !== 200) {
        const { detail } = await response.json();
        setError(detail);
        throw new Error(detail);
      }

      const responseData = await response.json();
      const {
        is_require_user_config_2fa,
        access_token: token,
        user: userData,
      } = responseData || {};

      // handle if user is from different organization
      if (userData?.organization_id && userData?.organization_id !== organizationId) {
        setOrganizationId(userData.organization_id);
      }

      if (is_require_user_config_2fa) {
        return { is_require_user_config_2fa };
      }

      await saveUserData(userData, token);
      return userData;
    } finally {
      setLoading(false);
    }
  }

  async function signup({ username, password }, autoLogin = true) {
    try {
      setLoading(true);
      const response = await fetch(`${backendHost}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: username,
          password,
          organization_id: user?.organization_id || organizationId,
        }),
      });

      if (response.status !== 200) {
        const { detail } = await response.json();
        setError(detail);
        throw new Error(detail);
      }

      if (autoLogin) {
        return login({ username, password });
      } else {
        return response.json();
      }
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await Promise.all([
      Preferences.remove({ key: 'token' }),
      Preferences.remove({ key: 'userData' }),
    ]);

    // Remove token from cookies
    removeCookie('token');

    setUser(null);
    window.location.reload();
    throw new Error('Unauthorized');
  }

  async function passwordlessLogin(passwordlessToken) {
    try {
      setLoading(true);
      const response = await fetch(`${backendHost}/passwordless-login?token=${passwordlessToken}`);

      if (response.status !== 200) {
        const { detail } = await response.json();
        setError(detail);
        throw new Error(detail);
      }

      const responseData = await response.json();
      const { access_token: token, user: userData } = responseData || {};

      await saveUserData(userData, token);
      return userData;
    } finally {
      setLoading(false);
    }
  }

  return {
    user,
    setUser,
    saveUserData,
    initUser,
    fetchUserData,
    fetchUser,
    login,
    signup,
    logout,
    passwordlessLogin,
    loading,
    error,
  };
}
