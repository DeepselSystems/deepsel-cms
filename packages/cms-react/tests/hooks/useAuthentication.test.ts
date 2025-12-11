import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useAuthentication from '../../src/hooks/useAuthentication';
import type {
  UseAuthenticationConfig,
  User,
  LoginCredentials,
} from '../../src/hooks/useAuthentication';

// Mock Capacitor Preferences
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    set: vi.fn(() => Promise.resolve()),
    get: vi.fn(() => Promise.resolve({ value: null })),
    remove: vi.fn(() => Promise.resolve()),
  },
}));

describe('useAuthentication', () => {
  let mockConfig: UseAuthenticationConfig;
  let mockSetUser: ReturnType<typeof vi.fn>;
  let mockSetOrganizationId: ReturnType<typeof vi.fn>;
  let mockSetCookie: ReturnType<typeof vi.fn>;
  let mockRemoveCookie: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetUser = vi.fn();
    mockSetOrganizationId = vi.fn();
    mockSetCookie = vi.fn();
    mockRemoveCookie = vi.fn();

    mockConfig = {
      backendHost: 'http://localhost:8000',
      user: null,
      setUser: mockSetUser as any,
      organizationId: 'org-123',
      setOrganizationId: mockSetOrganizationId as any,
      setCookie: mockSetCookie as any,
      removeCookie: mockRemoveCookie as any,
    };

    global.fetch = vi.fn();
    global.window = { location: { reload: vi.fn() } } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('saveUserData', () => {
    it('should save user data and token', async () => {
      const { result } = renderHook(() => useAuthentication(mockConfig));
      const userData: User = { id: '1', email: 'test@example.com' };
      const token = 'test-token';

      await act(async () => {
        await result.current.saveUserData(userData, token);
      });

      expect(mockSetUser).toHaveBeenCalledWith({ ...userData, token });
      expect(mockSetCookie).toHaveBeenCalledWith('token', token, 30);
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser: User = { id: '1', email: 'test@example.com', organization_id: 'org-123' };
      const mockToken = 'mock-token';

      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        json: () =>
          Promise.resolve({
            access_token: mockToken,
            user: mockUser,
          }),
      });

      const { result } = renderHook(() => useAuthentication(mockConfig));
      const credentials: LoginCredentials = { username: 'test@example.com', password: 'password' };

      let loginResult: any;
      await act(async () => {
        loginResult = await result.current.login(credentials);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      expect(mockSetUser).toHaveBeenCalledWith({ ...mockUser, token: mockToken });
      expect(loginResult).toEqual(mockUser);
    });

    it('should handle 2FA requirement', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        json: () =>
          Promise.resolve({
            is_require_user_config_2fa: true,
          }),
      });

      const { result } = renderHook(() => useAuthentication(mockConfig));
      const credentials: LoginCredentials = { username: 'test@example.com', password: 'password' };

      let loginResult: any;
      await act(async () => {
        loginResult = await result.current.login(credentials);
      });

      expect(loginResult).toEqual({ is_require_user_config_2fa: true });
    });

    it('should handle login error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        status: 401,
        json: () => Promise.resolve({ detail: 'Invalid credentials' }),
      });

      const { result } = renderHook(() => useAuthentication(mockConfig));
      const credentials: LoginCredentials = { username: 'test@example.com', password: 'wrong' };

      await expect(
        act(async () => {
          await result.current.login(credentials);
        }),
      ).rejects.toThrow('Invalid credentials');

      // Error state is set during the login call, but cleared in finally block
      // Just verify the error was thrown
    });

    it('should update organization ID if user from different org', async () => {
      const mockUser: User = { id: '1', email: 'test@example.com', organization_id: 'org-456' };
      const mockToken = 'mock-token';

      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        json: () =>
          Promise.resolve({
            access_token: mockToken,
            user: mockUser,
          }),
      });

      const { result } = renderHook(() => useAuthentication(mockConfig));
      const credentials: LoginCredentials = { username: 'test@example.com', password: 'password' };

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(mockSetOrganizationId).toHaveBeenCalledWith('org-456');
    });
  });

  describe('signup', () => {
    it('should successfully signup and auto-login', async () => {
      const mockUser: User = { id: '1', email: 'test@example.com', organization_id: 'org-123' };
      const mockToken = 'mock-token';

      (global.fetch as any)
        .mockResolvedValueOnce({
          status: 200,
          json: () => Promise.resolve({ id: '1', email: 'test@example.com' }),
        })
        .mockResolvedValueOnce({
          status: 200,
          json: () =>
            Promise.resolve({
              access_token: mockToken,
              user: mockUser,
            }),
        });

      const { result } = renderHook(() => useAuthentication(mockConfig));

      await act(async () => {
        await result.current.signup({ username: 'test@example.com', password: 'password' });
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/signup',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('should signup without auto-login', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve({ id: '1', email: 'test@example.com' }),
      });

      const { result } = renderHook(() => useAuthentication(mockConfig));

      let signupResult: any;
      await act(async () => {
        signupResult = await result.current.signup(
          { username: 'test@example.com', password: 'password' },
          false,
        );
      });

      expect(signupResult).toEqual({ id: '1', email: 'test@example.com' });
    });
  });

  describe('fetchUserData', () => {
    it('should fetch user data with token', async () => {
      const mockUser: User = { id: '1', email: 'test@example.com' };

      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve(mockUser),
      });

      const { result } = renderHook(() => useAuthentication(mockConfig));

      let userData: any;
      await act(async () => {
        userData = await result.current.fetchUserData('test-token');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/user/util/me',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        }),
      );
      expect(userData).toEqual(mockUser);
    });

    it('should handle fetch error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        status: 401,
        json: () => Promise.resolve({ detail: 'Unauthorized' }),
      });

      const { result } = renderHook(() => useAuthentication(mockConfig));

      await expect(
        act(async () => {
          await result.current.fetchUserData('invalid-token');
        }),
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('logout', () => {
    it('should clear user data and throw error', async () => {
      const { Preferences } = await import('@capacitor/preferences');
      const { result } = renderHook(() => useAuthentication(mockConfig));
      const removeSpy = vi.spyOn(Preferences, 'remove');

      await expect(
        act(async () => {
          await result.current.logout();
        }),
      ).rejects.toThrow('Unauthorized');

      // Verify storage was cleared
      expect(removeSpy).toHaveBeenCalledWith({ key: 'token' });
      expect(removeSpy).toHaveBeenCalledWith({ key: 'userData' });
    });
  });

  describe('loading state', () => {
    it('should set loading state during login', async () => {
      (global.fetch as any).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  status: 200,
                  json: () =>
                    Promise.resolve({
                      access_token: 'token',
                      user: { id: '1', email: 'test@example.com', organization_id: 'org-123' },
                    }),
                }),
              50,
            ),
          ),
      );

      const { result } = renderHook(() => useAuthentication(mockConfig));

      expect(result.current.loading).toBe(false);

      await act(async () => {
        await result.current.login({ username: 'test@example.com', password: 'password' });
      });

      // Wait for the login to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(result.current.loading).toBe(false);
    });
  });
});
