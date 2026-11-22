import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/auth.store';
import { queryClient } from './query-client';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    authVersion?: number;
  }
}

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const state = useAuthStore.getState();
  config.authVersion = state.authVersion;
  if (state.accessToken) config.headers.set('Authorization', `Bearer ${state.accessToken}`);
  else config.headers.delete('Authorization');
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) throw error;
    const url = error.config.url ?? '';
    if (/^\/auth\/(register|login|logout)(?:$|\?)/.test(url)) throw error;

    const state = useAuthStore.getState();
    if (state.accessToken && error.config.authVersion === state.authVersion) {
      state.clearSession();
      queryClient.clear();
    }
    throw error;
  },
);
