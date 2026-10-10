import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, confirmPassword?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('wm_token'));
  const [isLoading, setIsLoading] = useState(true);

  // On mount, try to restore user from localStorage & verify token
  useEffect(() => {
    const storedToken = localStorage.getItem('wm_token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    setToken(storedToken);
    fetchCurrentUser().finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      if (data.success) {
        setUser(data.data);
        localStorage.setItem('wm_user', JSON.stringify(data.data));
      }
    } catch {
      // Token invalid — clear storage
      localStorage.removeItem('wm_token');
      localStorage.removeItem('wm_user');
      setToken(null);
      setUser(null);
    }
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (!data.success) throw new Error(data.error?.message ?? 'Login failed');
    const { token: newToken, user: newUser } = data.data;
    localStorage.setItem('wm_token', newToken);
    localStorage.setItem('wm_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const register = async (name: string, email: string, password: string, confirmPassword?: string) => {
    const { data } = await api.post('/auth/register', { name, email, password, confirmPassword: confirmPassword ?? password });
    if (!data.success) throw new Error(data.error?.message ?? 'Registration failed');
    const { token: newToken, user: newUser } = data.data;
    localStorage.setItem('wm_token', newToken);
    localStorage.setItem('wm_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('wm_token');
    localStorage.removeItem('wm_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchCurrentUser();
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, isLoading,
      isAuthenticated: !!token && !!user,
      login, register, logout, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
