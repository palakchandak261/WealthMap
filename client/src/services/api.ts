import axios from 'axios';
import { handleMockRequest } from './mockApiHandler';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Helper to determine if demo mode is active
export const isDemoMode = (): boolean => {
  return localStorage.getItem('wm_demo_mode') === 'true';
};

// ── Request interceptor: route to mock handler if demo mode is enabled ────────
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('wm_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // If in demo mode, handle client-side via mock handler
  if (isDemoMode()) {
    const mockRes = await handleMockRequest({
      method: config.method,
      url: config.url,
      data: config.data,
      params: config.params,
    });
    // Return custom adapter response to resolve axios promise immediately
    config.adapter = () => Promise.resolve(mockRes);
  }

  return config;
});

// ── Response interceptor: auto fallback to mock handler if backend is offline ─
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If backend is unreachable (network error / connection refused / 502/503/504)
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';
    if (isNetworkError) {
      console.warn('Backend server offline or unreachable. Serving response from local demo data store.');
      try {
        const mockRes = await handleMockRequest({
          method: error.config?.method,
          url: error.config?.url,
          data: error.config?.data,
          params: error.config?.params,
        });
        return mockRes;
      } catch (mockErr) {
        return Promise.reject(mockErr);
      }
    }

    if (error.response?.status === 401 && !isDemoMode()) {
      localStorage.removeItem('wm_token');
      localStorage.removeItem('wm_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
