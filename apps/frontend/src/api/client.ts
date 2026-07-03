import axios from 'axios';

// __API_URL__ is replaced by Vite define at build time; in Jest it is undefined → fallback used
declare const __API_URL__: string | undefined;
const BASE_URL =
  (typeof __API_URL__ !== 'undefined' ? __API_URL__ : undefined) ?? 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let getToken: (() => string | null) | null = null;
let onUnauthorized: (() => void) | null = null;
let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

export function setTokenGetter(fn: () => string | null): void {
  getToken = fn;
}

export function setOnUnauthorized(fn: () => void): void {
  onUnauthorized = fn;
}

apiClient.interceptors.request.use((config) => {
  const token = getToken?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    const isRefreshCall = original?.url?.endsWith('/auth/refresh');

    if (error.response?.status !== 401 || original._retry || isRefreshCall) {
      if (isRefreshCall) onUnauthorized?.();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingRequests.push((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(original));
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await apiClient.post<{ accessToken: string }>('/auth/refresh');
      const newToken = data.accessToken;
      pendingRequests.forEach((cb) => cb(newToken));
      pendingRequests = [];
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch {
      pendingRequests = [];
      onUnauthorized?.();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);
