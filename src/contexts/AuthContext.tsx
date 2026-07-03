import { useState, createContext, useContext, type ReactNode } from 'react';

interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, name: string) => void;
  register: (email: string, name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [user, setUser] = useState<User | null>(() => {
    // 从 localStorage 恢复用户
    const savedUser = localStorage.getItem('todoist_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (email: string, name: string) => {
    const newUser = { email, name };
    setUser(newUser);
    localStorage.setItem('todoist_user', JSON.stringify(newUser));
  };

  const register = (email: string, name: string) => {
    // 暂时和登录一样，等后端完成后换成真实注册
    const newUser = { email, name };
    setUser(newUser);
    localStorage.setItem('todoist_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('todoist_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
