import { useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { Device } from '@capacitor/device';
import { useNetwork } from '@mantine/hooks';
import { useLocation } from 'react-router-dom';
import { useDeviceData } from 'react-device-detect';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '../types';

export type { User };

export interface LoginCredentials {
  username: string;
  password: string;
  otp?: string;
}

export interface SignupCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  is_require_user_config_2fa?: boolean;
  access_token?: string;
  user?: User;
}

export interface UseAuthenticationConfig {
  backendHost: string;
  user: User | null;
  setUser: (user: User | null) => void;
  organizationId?: number;
  setOrganizationId?: (id: number) => void;
  setCookie?: (name: string, value: string, days: number) => void;
  removeCookie?: (name: string) => void;
}

export interface UseAuthenticationReturn {
  user: User | null;
  setUser: (user: User | null) => void;
  saveUserData: (userData: User, token: string) => Promise<void[]>;
  initUser: () => Promise<unknown>;
  fetchUserData: (token: string) => Promise<User>;
  fetchUser: (token?: string | null) => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<User | { is_require_user_config_2fa: boolean }>;
  signup: (credentials: SignupCredentials, autoLogin?: boolean) => Promise<unknown>;
  logout: () => Promise<never>;
  passwordlessLogin: (passwordlessToken: string) => Promise<User>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for managing user authentication — login, signup, logout, session persistence
 */
export function useAuthentication(
  config: UseAuthenticationConfig,
): UseAuthenticationReturn {
  const { backendHost, user, setUser, organizationId, setOrganizationId, setCookie, removeCookie } =
    config;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const network = useNetwork();
  const location = useLocation();
  const deviceData = useDeviceData(navigator.userAgent);

  async function saveUserData(userData: User, token: string): Promise<void[]> {
    setUser({ ...userData, token });

    if (setCookie) {
      setCookie('token', token, 30);
    }

    return Promise.all([
      Preferences.set({ key: 'userData', value: JSON.stringify(userData) }),
      Preferences.set({ key: 'token', value: token }),
    ]);
  }

  async function initUser(): Promise<unknown> {
    const deviceInfo = await Device.getInfo();
    const deviceInfoExtended = {
      ...deviceInfo,
      location,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      network,
      os_version: deviceInfo.osVersion === 'unknown' ? deviceData.os.name : deviceInfo.osVersion,
      browser: deviceData.browser,
      cpu: deviceData.cpu,
    };

    let anonymousId = (await Preferences.get({ key: 'anonymousId' })).value;
    if (!anonymousId) {
      anonymousId = uuidv4();
      await Preferences.set({ key: 'anonymousId', value: anonymousId });
    }

    const res = await fetch(`${backendHost}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_info: deviceInfoExtended,
        organization_id: user?.organization_id || organizationId,
        anonymous_id: anonymousId,
      }),
    });
    return res.json();
  }

  async function fetchUserData(token: string): Promise<User> {
    const response = await fetch(`${backendHost}/user/util/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status !== 200) {
      const { detail } = await response.json();
      if (typeof detail === 'string') {
        setError(detail);
        throw new Error(detail);
      }
    }
    return response.json();
  }

  async function fetchUser(token: string | null = null): Promise<void> {
    const userToken = token || user?.token;
    if (!userToken) {
      throw new Error('No token available');
    }
    const userData = await fetchUserData(userToken);
    await saveUserData(userData, userToken);
  }

  async function login(
    credentials: LoginCredentials,
  ): Promise<User | { is_require_user_config_2fa: boolean }> {
    try {
      setLoading(true);
      const { username, password, otp = '' } = credentials;
      const encodedUsername = encodeURIComponent(username);
      const encodedPassword = encodeURIComponent(password);
      const response = await fetch(`${backendHost}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodedUsername}&password=${encodedPassword}&otp=${otp}`,
      });

      if (response.status !== 200) {
        const { detail } = await response.json();
        if (typeof detail === 'string') {
          setError(detail);
          throw new Error(detail);
        }
      }

      const responseData: LoginResponse = await response.json();
      const {
        is_require_user_config_2fa,
        access_token: token,
        user: userData,
      } = responseData || {};

      if (
        userData?.organization_id &&
        userData.organization_id !== organizationId &&
        setOrganizationId
      ) {
        setOrganizationId(userData.organization_id as number);
      }

      if (is_require_user_config_2fa) {
        return { is_require_user_config_2fa };
      }

      if (!userData || !token) {
        throw new Error('Invalid response from server');
      }

      await saveUserData(userData, token);
      return userData;
    } finally {
      setLoading(false);
    }
  }

  async function signup(credentials: SignupCredentials, autoLogin = true): Promise<unknown> {
    try {
      setLoading(true);
      const { username, password } = credentials;
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
        if (typeof detail === 'string') {
          setError(detail);
          throw new Error(detail);
        }
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

  async function logout(): Promise<never> {
    await Promise.all([
      Preferences.remove({ key: 'token' }),
      Preferences.remove({ key: 'userData' }),
    ]);

    // Remove token from cookies
    if (removeCookie) {
      removeCookie('token');
    }

    setUser(null);
    window.location.reload();
    throw new Error('Unauthorized');
  }

  async function passwordlessLogin(passwordlessToken: string): Promise<User> {
    try {
      setLoading(true);
      const response = await fetch(`${backendHost}/passwordless-login?token=${passwordlessToken}`);

      if (response.status !== 200) {
        const { detail } = (await response.json()) as { detail: string };
        setError(detail);
        throw new Error(detail);
      }

      const responseData: LoginResponse = await response.json();
      const { access_token: token, user: userData } = responseData || {};

      if (!userData || !token) {
        throw new Error('Invalid response from server');
      }

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
