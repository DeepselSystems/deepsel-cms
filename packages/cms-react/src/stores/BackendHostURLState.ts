import { create } from 'zustand';

interface BackendHostURLState {
  backendHost: string;
  setBackendHost: (backendHost: string) => void;
  resetDefault: () => void;
}

/**
 * Factory that creates a Zustand store for managing the backend host URL.
 * The consumer provides the default host (typically from their env config).
 *
 * @param defaultHost - The default backend host URL (e.g. from import.meta.env.PUBLIC_BACKEND)
 * @returns A Zustand store hook
 *
 * @example
 * export const BackendHostURLState = createBackendHostURLState(import.meta.env.PUBLIC_BACKEND);
 */
export const createBackendHostURLState = (defaultHost: string) => {
  const storedHost =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('backendHost')
      : null;

  return create<BackendHostURLState>((set) => ({
    backendHost: storedHost || defaultHost,
    setBackendHost: (backendHost) => {
      localStorage.setItem('backendHost', backendHost);
      set(() => ({ backendHost }));
    },
    resetDefault: () => set(() => ({ backendHost: defaultHost })),
  }));
};
