import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  username?: string;
  organization_id?: string | number;
  token?: string;
  [key: string]: unknown;
}

interface UserState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

/**
 * Global store for the authenticated user session
 */
export const UserState = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set(() => ({ user })),
  logout: () => set(() => ({ user: null })),
}));
