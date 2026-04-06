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
  saveUserData: (userData: User) => Promise<void>;
  initUser: () => Promise<unknown>;
  fetchUserData: () => Promise<User>;
  fetchUser: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<User | { is_require_user_config_2fa: boolean }>;
  signup: (credentials: SignupCredentials, autoLogin?: boolean) => Promise<unknown>;
  logout: () => Promise<never>;
  passwordlessLogin: (passwordlessToken: string) => Promise<User>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for managing user authentication — login, signup, logout, session persistence.
 *
 * Uses httpOnly session cookies for auth (set by the server).
 * Token is never stored client-side — the cookie is managed by the browser automatically.
 */
export function useAuthentication(config: UseAuthenticationConfig): UseAuthenticationReturn {
  const { backendHost, user, setUser, organizationId, setOrganizationId } = config;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const network = useNetwork();
  const location = useLocation();
  const deviceData = useDeviceData(navigator.userAgent);

  async function saveUserData(userData: User): Promise<void> {
    setUser(userData);
    await Preferences.set({ key: 'userData', value: JSON.stringify(userData) });
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
      credentials: 'include',
      body: JSON.stringify({
        device_info: deviceInfoExtended,
        organization_id: user?.organization_id || organizationId,
        anonymous_id: anonymousId,
      }),
    });
    return res.json();
  }

  async function fetchUserData(): Promise<User> {
    const response = await fetch(`${backendHost}/user/util/me`, {
      credentials: 'include',
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

  async function fetchUser(): Promise<void> {
    const userData = await fetchUserData();
    await saveUserData(userData);
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
        credentials: 'include',
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

      if (!userData) {
        throw new Error('Invalid response from server');
      }

      await saveUserData(userData);
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
        credentials: 'include',
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
    // Tell server to invalidate session and clear cookie
    try {
      await fetch(`${backendHost}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Best effort — proceed with local cleanup even if server is unreachable
    }

    await Preferences.remove({ key: 'userData' });
    setUser(null);
    window.location.reload();
    throw new Error('Unauthorized');
  }

  async function passwordlessLogin(passwordlessToken: string): Promise<User> {
    try {
      setLoading(true);
      const response = await fetch(`${backendHost}/passwordless-login?token=${passwordlessToken}`, {
        credentials: 'include',
      });

      if (response.status !== 200) {
        const { detail } = (await response.json()) as { detail: string };
        setError(detail);
        throw new Error(detail);
      }

      const responseData: LoginResponse = await response.json();
      const { user: userData } = responseData || {};

      if (!userData) {
        throw new Error('Invalid response from server');
      }

      await saveUserData(userData);
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
