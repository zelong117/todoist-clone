import { useState } from 'react';

interface RegisterPageProps {
  onRegister: (email: string, name: string) => void;
  onSwitchToLogin: () => void;
}

export default function RegisterPage({ onRegister, onSwitchToLogin }: RegisterPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = '请输入用户名';
    }
    
    if (!email) {
      newErrors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '邮箱格式不正确';
    }
    
    if (!password) {
      newErrors.password = '请输入密码';
    } else if (password.length < 6) {
      newErrors.password = '密码至少6位';
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = '两次密码不一致';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // 暂时直接注册，等后端完成后换成真实注册
      onRegister(email, name);
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
          <p className="text-[var(--text-secondary)] mt-2">创建账号，开始高效工作</p>
        </div>

        {/* 注册表单 */}
        <div className="bg-[var(--bg-card)] rounded-2xl shadow-xl p-8 border border-[var(--border-color)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">注册</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 用户名 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                用户名
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入用户名"
                className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all ${
                  errors.name ? 'border-red-500' : 'border-[var(--border-color)]'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>

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
                className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all ${
                  errors.email ? 'border-red-500' : 'border-[var(--border-color)]'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
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
                  placeholder="请输入密码（至少6位）"
                  className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all pr-12 ${
                    errors.password ? 'border-red-500' : 'border-[var(--border-color)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* 确认密码 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                确认密码
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all ${
                  errors.confirmPassword ? 'border-red-500' : 'border-[var(--border-color)]'
                }`}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* 服务条款 */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 mt-0.5 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]" required />
              <span className="text-sm text-[var(--text-secondary)]">
                我已阅读并同意{' '}
                <button type="button" className="text-[var(--accent)] hover:underline">服务条款</button>
                {' '}和{' '}
                <button type="button" className="text-[var(--accent)] hover:underline">隐私政策</button>
              </span>
            </label>

            {/* 注册按钮 */}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-[var(--accent)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg"
            >
              创建账号
            </button>
          </form>

          {/* 分割线 */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-[var(--border-color)]"></div>
            <span className="text-sm text-[var(--text-tertiary)]">或</span>
            <div className="flex-1 h-px bg-[var(--border-color)]"></div>
          </div>

          {/* 社交注册 */}
          <div className="space-y-3">
            <button className="w-full py-3 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-medium hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center gap-2">
              <span>🌐</span>
              <span>使用 Google 注册</span>
            </button>
            <button className="w-full py-3 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-medium hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center gap-2">
              <span>💬</span>
              <span>使用微信注册</span>
            </button>
          </div>

          {/* 登录链接 */}
          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            已有账号？
            <button
              onClick={onSwitchToLogin}
              className="ml-1 text-[var(--accent)] hover:underline font-medium"
            >
              立即登录
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
