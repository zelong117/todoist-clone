import { useState, createContext, useContext, useEffect, type ReactNode } from 'react';
import { useStore } from '../store';
import { authAPI } from '../api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3001/api`;
const STORAGE_KEY = 'todoist-clone-storage';
const OWNER_KEY = 'todoist-local-data-owner';

function activateWorkspace(userId: string) {
  const ownerId = localStorage.getItem(OWNER_KEY);
  if (!ownerId) {
    const legacyData = localStorage.getItem(STORAGE_KEY);
    if (legacyData) {
      if (!localStorage.getItem('todoist-legacy-backup-v1')) localStorage.setItem('todoist-legacy-backup-v1', legacyData);
      localStorage.setItem(`${STORAGE_KEY}:${userId}`, legacyData);
    }
    localStorage.setItem(OWNER_KEY, userId);
    return;
  }
  if (ownerId === userId) return;

  const currentData = localStorage.getItem(STORAGE_KEY);
  if (currentData) localStorage.setItem(`${STORAGE_KEY}:${ownerId}`, currentData);

  const targetData = localStorage.getItem(`${STORAGE_KEY}:${userId}`);
  if (targetData) {
    localStorage.setItem(STORAGE_KEY, targetData);
    try {
      const parsed = JSON.parse(targetData);
      useStore.setState(parsed.state || {});
    } catch {
      useStore.getState().resetStore();
    }
  } else {
    useStore.getState().resetStore();
  }
  localStorage.setItem(OWNER_KEY, userId);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('todoist_token');
  });
  const [loading, setLoading] = useState(true);

  // 检查 token 是否有效
  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        const oauthCode = window.location.pathname === '/oauth/callback'
          ? new URLSearchParams(window.location.search).get('code')
          : null;
        if (!oauthCode) {
          setLoading(false);
          return;
        }
        try {
          const response = await fetch(`${API_URL}/auth/oauth/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: oauthCode }),
          });
          if (!response.ok) throw new Error('OAuth sign-in failed');
          const data = await response.json();
          activateWorkspace(data.user.id);
          localStorage.setItem('todoist_token', data.token);
          window.history.replaceState({}, '', '/app/inbox');
          setUser(data.user);
          setToken(data.token);
          startRefreshTimer(data.token);
        } catch (error) {
          console.error('OAuth exchange failed:', error);
          window.history.replaceState({}, '', '/login');
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          activateWorkspace(userData.id);
          setUser(userData);
        } else {
          // Token 无效，清除
          localStorage.removeItem('todoist_token');
          setToken(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
    } catch (error) {
      throw new Error('无法连接到后端服务，请确认 3001 端口后端已启动');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '登录失败' }));
      throw new Error(error.error || '登录失败');
    }

    const data = await response.json();
    activateWorkspace(data.user.id);
    localStorage.setItem('todoist_token', data.token);
    setToken(data.token);
    setUser(data.user);
    startRefreshTimer(data.token);
  };

  const register = async (email: string, name: string, password: string) => {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, name, password })
      });
    } catch (error) {
      throw new Error('无法连接到后端服务，请确认 3001 端口后端已启动');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '注册失败' }));
      throw new Error(error.error || '注册失败');
    }

    const data = await response.json();
    activateWorkspace(data.user.id);
    localStorage.setItem('todoist_token', data.token);
    setToken(data.token);
    setUser(data.user);
    startRefreshTimer(data.token);
  };

  // Auto-refresh token every 6 days (before 7-day expiry)
  const refreshTimerRef = { current: null as ReturnType<typeof setTimeout> | null };
  
  const startRefreshTimer = (currentToken: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${currentToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem('todoist_token', data.token);
          setToken(data.token);
          setUser(data.user);
          startRefreshTimer(data.token);
          console.log('[Auth] Token refreshed successfully');
        } else {
          console.log('[Auth] Token refresh failed, user needs to re-login');
        }
      } catch (err) {
        console.error('[Auth] Token refresh error:', err);
      }
    }, 6 * 24 * 60 * 60 * 1000); // 6 days
  };

  // Start refresh timer on mount if token exists
  useEffect(() => {
    if (token) startRefreshTimer(token);
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    if (token) void authAPI.logout().catch(() => undefined);
    localStorage.removeItem('todoist_token');
    const ownerId = localStorage.getItem(OWNER_KEY);
    const currentData = localStorage.getItem(STORAGE_KEY);
    if (ownerId && currentData) localStorage.setItem(`${STORAGE_KEY}:${ownerId}`, currentData);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
