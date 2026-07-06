import { useState, createContext, useContext, useEffect, type ReactNode } from 'react';

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
        setLoading(false);
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
    localStorage.setItem('todoist_token', data.token);
    setToken(data.token);
    setUser(data.user);
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
    localStorage.setItem('todoist_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('todoist_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
