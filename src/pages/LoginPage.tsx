import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckSquare, Timer, Sparkles, Users, BarChart3, Zap, Shield, Globe, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0b]">
      {/* 顶部导航 */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">T</span>
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">TaskFlow</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">功能</a>
          <a href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">定价</a>
          <button
            onClick={() => document.getElementById('login-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            开始使用
          </button>
        </div>
      </nav>

      {/* Hero 区域 */}
      <section className="max-w-6xl mx-auto px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium mb-6">
          <Zap size={12} />
          全新 v2.0 已发布
        </div>
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
          让每一天都<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">高效有序</span>
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          集任务管理、番茄钟、AI 智能整理于一体的工作台。<br className="hidden sm:block" />
          无论是个人待办还是团队协作，都能轻松应对。
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => document.getElementById('login-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-gray-900/20"
          >
            免费开始 <ArrowRight size={16} />
          </button>
          <a href="#features" className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            了解更多
          </a>
        </div>
      </section>

      {/* 功能卡片 */}
      <section id="features" className="max-w-6xl mx-auto px-8 pb-16">
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: CheckSquare, title: '三视图任务管理', desc: '列表 / 看板 / 日历自由切换，拖拽排序', color: 'from-blue-500 to-cyan-500' },
            { icon: Timer, title: '番茄钟专注', desc: '后台持续计时，离开页面也不中断', color: 'from-red-500 to-orange-500' },
            { icon: Sparkles, title: 'AI 智能助手', desc: '文字优化、图片识别、目标分析一键完成', color: 'from-purple-500 to-pink-500' },
            { icon: Users, title: '团队协作', desc: '项目共享、角色权限、实时同步', color: 'from-green-500 to-emerald-500' },
            { icon: BarChart3, title: '效率统计', desc: '完成率、专注时长、过期预警一目了然', color: 'from-amber-500 to-yellow-500' },
            { icon: Shield, title: '安全可靠', desc: 'JWT 认证、数据加密、定时备份', color: 'from-slate-500 to-gray-500' },
          ].map((f, i) => (
            <div key={i} className="group p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-lg transition-all duration-200">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon size={18} className="text-white" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 登录表单 */}
      <section id="login-form" className="max-w-6xl mx-auto px-8 pb-20">
        <div className="max-w-sm mx-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">登录</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">欢迎回来，请输入您的账号</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">密码</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
                  >
                    {showPassword ? '隐藏' : '显示'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">记住我</span>
                </label>
                <button type="button" className="text-xs text-blue-500 hover:text-blue-600">忘记密码？</button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800"></div>
              <span className="text-xs text-gray-400">或</span>
              <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800"></div>
            </div>

            <div className="space-y-2">
              <button className="w-full py-2.5 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors flex items-center justify-center gap-2">
                <Globe size={14} />
                <span>Google 登录</span>
              </button>
            </div>

            <p className="mt-5 text-center text-xs text-gray-400">
              还没有账号？
              <button onClick={onSwitchToRegister} className="ml-1 text-blue-500 hover:text-blue-600 font-medium">注册</button>
            </p>
          </div>
        </div>
      </section>

      {/* 定价 */}
      <section id="pricing" className="max-w-6xl mx-auto px-8 pb-20">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">选择适合你的方案</h2>
        <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
            <div className="text-xs font-medium text-gray-400 mb-1">当前版本</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">免费版</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-4">¥0<span className="text-sm font-normal text-gray-400">/月</span></div>
            <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              {['任务管理（3 视图）', '番茄钟', 'AI 助手（本地规则）', '基础统计'].map((f, i) => (
                <li key={i} className="flex items-center gap-2"><CheckSquare size={14} className="text-green-500 flex-shrink-0" />{f}</li>
              ))}
            </ul>
          </div>
          <div className="p-6 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 relative overflow-hidden">
            <div className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-medium bg-white/20 dark:bg-gray-900/10 rounded-full">推荐</div>
            <div className="text-xs font-medium opacity-60 mb-1">升级到</div>
            <div className="text-lg font-bold mb-1">商务版</div>
            <div className="text-3xl font-bold mb-4">¥29<span className="text-sm font-normal opacity-60">/月</span></div>
            <ul className="space-y-2 text-sm opacity-80">
              {['全部免费版功能', 'AI 智能识别（图片+文字）', '团队协作（无限成员）', '数据备份与恢复', '优先客服'].map((f, i) => (
                <li key={i} className="flex items-center gap-2"><CheckSquare size={14} className="text-green-400 flex-shrink-0" />{f}</li>
              ))}
            </ul>
            <button className="mt-6 w-full py-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              立即升级
            </button>
          </div>
        </div>
      </section>

      {/* 底部 */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-6">
        <div className="max-w-6xl mx-auto px-8 flex items-center justify-between text-xs text-gray-400">
          <span>© 2026 TaskFlow. All rights reserved.</span>
          <span>React + Express + SQLite</span>
        </div>
      </footer>
    </div>
  );
}
