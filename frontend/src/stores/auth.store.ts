import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  authVersion: number;
  isInitialized: boolean;
  setSession: (user: User, accessToken: string) => void;
  clearSession: () => void;
  initializeAnonymous: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  authVersion: 0,
  isInitialized: false,
  setSession: (user, accessToken) =>
    set((state) => ({
      user,
      accessToken,
      authVersion: state.authVersion + 1,
      isInitialized: true,
    })),
  clearSession: () =>
    set((state) => ({
      user: null,
      accessToken: null,
      authVersion: state.authVersion + 1,
      isInitialized: true,
    })),
  initializeAnonymous: () =>
    set((state) => ({
      user: null,
      accessToken: null,
      authVersion: state.authVersion + 1,
      isInitialized: true,
    })),
}));
