import axios, { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { handleMockRequest } from './mockApiHandler';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

/** Demo mode = everything runs in the browser against localStorage data. */
export const isDemoMode = (): boolean => {
  try {
    return localStorage.getItem('wm_demo_mode') === 'true';
  } catch {
    return false;
  }
};

/** Axios adapter that answers requests from the in-browser demo backend. */
const demoAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const res = await handleMockRequest({
    method: config.method,
    url: config.url,
    data: config.data,
    params: config.params,
  });
  const response: AxiosResponse = {
    data: res.body,
    status: res.status,
    statusText: res.status < 400 ? 'OK' : 'Error',
    headers: {},
    config,
    request: {},
  };
  if (res.status >= 400) {
    const message = (res.body as { error?: { message?: string } })?.error?.message ?? `Request failed with status ${res.status}`;
    throw new AxiosError(message, res.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST, config, response.request, response);
  }
  return response;
};

// ── Request interceptor: auth header + demo routing ──────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wm_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  if (isDemoMode()) config.adapter = demoAdapter;
  return config;
});

// ── Response interceptor: session expiry ──────────────────────────────────────
// Normal mode never silently switches to fake data: if the server is down the
// page shows a clear "cannot reach server" error (and Login offers demo mode).
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url ?? '';
    const isAuthCall = /\/auth\/(login|register|send-otp|verify-otp|forgot-password|reset-password)/.test(url);
    if (error.response?.status === 401 && !isDemoMode() && !isAuthCall) {
      localStorage.removeItem('wm_token');
      localStorage.removeItem('wm_user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
