import { useState } from 'react';
import { Preferences } from '@capacitor/preferences';

// Types
export interface User {
  id: string;
  email: string;
  username?: string;
  organization_id?: string;
  token?: string;
  [key: string]: any;
}

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
  organizationId?: string;
  setOrganizationId?: (id: string) => void;
  setCookie?: (name: string, value: string, days: number) => void;
  removeCookie?: (name: string) => void;
}

export interface UseAuthenticationReturn {
  user: User | null;
  setUser: (user: User | null) => void;
  saveUserData: (userData: User, token: string) => Promise<void[]>;
  fetchUserData: (token: string) => Promise<User>;
  fetchUser: (token?: string | null) => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<User | { is_require_user_config_2fa: boolean }>;
  signup: (credentials: SignupCredentials, autoLogin?: boolean) => Promise<any>;
  logout: () => Promise<never>;
  loading: boolean;
  error: string | null;
}

export default function useAuthentication(
  config: UseAuthenticationConfig,
): UseAuthenticationReturn {
  const { backendHost, user, setUser, organizationId, setOrganizationId, setCookie, removeCookie } =
    config;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveUserData(userData: User, token: string): Promise<void[]> {
    setUser({ ...userData, token });

    // Store token in cookies for SSR access
    if (setCookie) {
      setCookie('token', token, 30);
    }

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

      // handle if user is from different organization
      if (
        userData?.organization_id &&
        userData?.organization_id !== organizationId &&
        setOrganizationId
      ) {
        setOrganizationId(userData.organization_id);
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

  async function signup(
    credentials: SignupCredentials,
    autoLogin = true,
  ): Promise<User | { is_require_user_config_2fa: boolean }> {
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

  return {
    user,
    setUser,
    saveUserData,
    fetchUserData,
    fetchUser,
    login,
    signup,
    logout,
    loading,
    error,
  };
}
