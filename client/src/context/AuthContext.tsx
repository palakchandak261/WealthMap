import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import api, { isDemoMode } from '../services/api';
import { resetMockStore, clearMockStore } from '../services/mockData';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** true while exploring the browser-only demo (no backend involved) */
  isDemo: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, confirmPassword?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setAuthData: (token: string, user: User) => void;
  /** Start (or restart with fresh sample data) the offline demo */
  startDemo: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_FLAG = 'wm_demo_mode';
const leaveDemoMode = () => {
  localStorage.removeItem(DEMO_FLAG);
  clearMockStore();
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('wm_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState<boolean>(isDemoMode());

  const fetchCurrentUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      if (data.success) {
        setUser(data.data);
        localStorage.setItem('wm_user', JSON.stringify(data.data));
      }
    } catch (err) {
      // Only a rejected token logs the user out. If the server is merely
      // unreachable, keep the cached profile so a restart doesn't sign them out.
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const cached = localStorage.getItem('wm_user');
      if (status === undefined && cached) {
        try { setUser(JSON.parse(cached)); return; } catch { /* fall through */ }
      }
      localStorage.removeItem('wm_token');
      localStorage.removeItem('wm_user');
      setToken(null);
      setUser(null);
    }
  }, []);

  // On mount, restore the session & verify the token
  useEffect(() => {
    const storedToken = localStorage.getItem('wm_token');
    if (!storedToken) {
      if (isDemoMode()) { leaveDemoMode(); setIsDemo(false); }
      setIsLoading(false);
      return;
    }
    setToken(storedToken);
    fetchCurrentUser().finally(() => setIsLoading(false));
  }, [fetchCurrentUser]);

  const storeSession = (newToken: string, newUser: User) => {
    localStorage.setItem('wm_token', newToken);
    localStorage.setItem('wm_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const login = async (email: string, password: string) => {
    // A real login always talks to the real backend
    leaveDemoMode();
    setIsDemo(false);
    const { data } = await api.post('/auth/login', { email, password });
    if (!data.success) throw new Error(data.error?.message ?? 'Login failed');
    storeSession(data.data.token, data.data.user);
  };

  const register = async (name: string, email: string, password: string, confirmPassword?: string) => {
    leaveDemoMode();
    setIsDemo(false);
    const { data } = await api.post('/auth/register', { name, email, password, confirmPassword: confirmPassword ?? password });
    if (!data.success) throw new Error(data.error?.message ?? 'Registration failed');
    // Token is not returned here because the user must verify the OTP first
  };

  const logout = useCallback(() => {
    localStorage.removeItem('wm_token');
    localStorage.removeItem('wm_user');
    leaveDemoMode();
    setIsDemo(false);
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  const setAuthData = useCallback((newToken: string, newUser: User) => {
    storeSession(newToken, newUser);
  }, []);

  const startDemo = useCallback(() => {
    const store = resetMockStore();
    localStorage.setItem(DEMO_FLAG, 'true');
    setIsDemo(true);
    storeSession('demo-token', store.user);
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <AuthContext.Provider value={{
      user, token, isLoading, isDemo,
      isAuthenticated: !!token && !!user,
      login, register, logout, refreshUser, setAuthData, startDemo,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
