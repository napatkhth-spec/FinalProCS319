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
  beginSessionInitialization: (accessToken: string) => void;
}

const accessTokenStorageKey = 'local-farmer-market.access-token';

export function readStoredAccessToken() {
  try {
    return globalThis.localStorage?.getItem(accessTokenStorageKey) ?? null;
  } catch {
    return null;
  }
}

function writeStoredAccessToken(accessToken: string | null) {
  try {
    if (accessToken) globalThis.localStorage?.setItem(accessTokenStorageKey, accessToken);
    else globalThis.localStorage?.removeItem(accessTokenStorageKey);
  } catch {
    // Keep the in-memory session usable when browser storage is unavailable.
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  authVersion: 0,
  isInitialized: false,
  setSession: (user, accessToken) => {
    writeStoredAccessToken(accessToken);
    set((state) => ({
      user,
      accessToken,
      authVersion: state.authVersion + 1,
      isInitialized: true,
    }));
  },
  clearSession: () => {
    writeStoredAccessToken(null);
    set((state) => ({
      user: null,
      accessToken: null,
      authVersion: state.authVersion + 1,
      isInitialized: true,
    }));
  },
  initializeAnonymous: () =>
    set((state) => ({
      user: null,
      accessToken: null,
      authVersion: state.authVersion + 1,
      isInitialized: true,
    })),
  beginSessionInitialization: (accessToken) =>
    set((state) => ({
      user: null,
      accessToken,
      authVersion: state.authVersion + 1,
      isInitialized: false,
    })),
}));
