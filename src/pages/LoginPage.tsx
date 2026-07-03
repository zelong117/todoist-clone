import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export default function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--accent)] flex items-center justify-center shadow-lg">
            <span className="text-white text-3xl font-bold">T</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Todoist Clone</h1>
          <p className="text-[var(--text-secondary)] mt-2">任务管理，从此简单</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-[var(--bg-card)] rounded-2xl shadow-xl p-8 border border-[var(--border-color)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">登录</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 邮箱 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                required
              />
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* 记住我 & 忘记密码 */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]" />
                <span className="text-sm text-[var(--text-secondary)]">记住我</span>
              </label>
              <button type="button" className="text-sm text-[var(--accent)] hover:underline">
                忘记密码？
              </button>
            </div>

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[var(--accent)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          {/* 分割线 */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-[var(--border-color)]"></div>
            <span className="text-sm text-[var(--text-tertiary)]">或</span>
            <div className="flex-1 h-px bg-[var(--border-color)]"></div>
          </div>

          {/* 社交登录 */}
          <div className="space-y-3">
            <button className="w-full py-3 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-medium hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center gap-2">
              <span>🌐</span>
              <span>使用 Google 登录</span>
            </button>
            <button className="w-full py-3 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-medium hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center gap-2">
              <span>💬</span>
              <span>使用微信登录</span>
            </button>
          </div>

          {/* 注册链接 */}
          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            还没有账号？
            <button
              onClick={onSwitchToRegister}
              className="ml-1 text-[var(--accent)] hover:underline font-medium"
            >
              立即注册
            </button>
          </p>
        </div>

        {/* 底部信息 */}
        <p className="text-center text-xs text-[var(--text-tertiary)] mt-6">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}
