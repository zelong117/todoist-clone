import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckSquare, Calendar, Timer, Sparkles, Users, BarChart3, ChevronRight } from 'lucide-react';

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

  const features = [
    { icon: CheckSquare, title: '任务管理', desc: '列表 / 看板 / 日历三视图，拖拽排序' },
    { icon: Timer, title: '番茄钟', desc: '专注计时，后台持续运行' },
    { icon: Sparkles, title: 'AI 助手', desc: '文字优化 + 目标分析 + 智能排期' },
    { icon: Calendar, title: '日程排期', desc: '到期提醒，过期预警' },
    { icon: Users, title: '团队协作', desc: '项目共享，角色权限管理' },
    { icon: BarChart3, title: '效率统计', desc: '完成率、专注时长一目了然' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex">
      {/* 左侧介绍面板 */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-10 text-white relative overflow-hidden">
        {/* 装饰圆 */}
        <div className="absolute top-[-100px] right-[-80px] w-72 h-72 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute bottom-[-60px] left-[-40px] w-48 h-48 rounded-full bg-blue-500/20 blur-3xl" />

        {/* Logo + 标题 */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#DC4C3E] to-[#B83A2E] flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl font-bold">T</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">Todoist Clone</h1>
              <p className="text-sm text-white/60">任务管理，从此简单</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-3 leading-tight">
            让每一天都<br />高效有序
          </h2>
          <p className="text-white/60 text-sm leading-relaxed mb-8">
            集任务管理、番茄钟、AI 智能整理于一体的工作台。无论是个人待办还是团队协作，都能轻松应对。
          </p>

          {/* 功能列表 */}
          <div className="space-y-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <f.icon size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium">{f.title}</span>
                  <span className="text-xs text-white/50 ml-2">{f.desc}</span>
                </div>
                <ChevronRight size={14} className="text-white/30" />
              </div>
            ))}
          </div>
        </div>

        {/* 底部 */}
        <div className="relative z-10 flex items-center justify-between text-xs text-white/40">
          <span>v2.0 · 商用版</span>
          <span>React + Express + SQLite</span>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* 移动端 Logo */}
          <div className="lg:hidden text-center mb-8">
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
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入邮箱"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">密码</label>
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

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]" />
                  <span className="text-sm text-[var(--text-secondary)]">记住我</span>
                </label>
                <button type="button" className="text-sm text-[var(--accent)] hover:underline">忘记密码？</button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[var(--accent)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-[var(--border-color)]"></div>
              <span className="text-sm text-[var(--text-tertiary)]">或</span>
              <div className="flex-1 h-px bg-[var(--border-color)]"></div>
            </div>

            <div className="space-y-3">
              <button className="w-full py-3 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-medium hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center gap-2">
                <span>🌐</span><span>使用 Google 登录</span>
              </button>
              <button className="w-full py-3 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-medium hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center gap-2">
                <span>💬</span><span>使用微信登录</span>
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
              还没有账号？
              <button onClick={onSwitchToRegister} className="ml-1 text-[var(--accent)] hover:underline font-medium">立即注册</button>
            </p>
          </div>

          <p className="text-center text-xs text-[var(--text-tertiary)] mt-6">
            登录即表示您同意我们的服务条款和隐私政策
          </p>
        </div>

        {/* 付费升级区域 */}
        <div className="mt-8 grid grid-cols-2 gap-4 max-w-md">
          {/* 免费版 */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 text-center">
            <div className="text-xs font-medium text-[var(--text-tertiary)] mb-1">当前版本</div>
            <div className="text-lg font-bold text-[var(--text-primary)] mb-2">免费版</div>
            <div className="text-2xl font-bold text-[var(--text-primary)] mb-3">¥0<span className="text-sm font-normal text-[var(--text-tertiary)]">/月</span></div>
            <ul className="text-xs text-[var(--text-tertiary)] space-y-1.5 text-left">
              <li className="flex items-center gap-1.5"><span className="text-green-500">✓</span> 任务管理（3 视图）</li>
              <li className="flex items-center gap-1.5"><span className="text-green-500">✓</span> 番茄钟</li>
              <li className="flex items-center gap-1.5"><span className="text-green-500">✓</span> AI 助手（本地）</li>
              <li className="flex items-center gap-1.5"><span className="text-gray-400">✗</span> AI 智能识别</li>
              <li className="flex items-center gap-1.5"><span className="text-gray-400">✗</span> 团队协作</li>
            </ul>
          </div>

          {/* 商务版 */}
          <div className="rounded-2xl border-2 border-purple-500/40 bg-gradient-to-br from-purple-500/5 to-blue-500/5 p-5 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 px-2 py-0.5 text-[10px] font-medium text-white bg-gradient-to-r from-purple-500 to-blue-500 rounded-bl-lg">推荐</div>
            <div className="text-xs font-medium text-purple-500 mb-1">升级到</div>
            <div className="text-lg font-bold text-[var(--text-primary)] mb-2">商务版</div>
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500 mb-3">¥29<span className="text-sm font-normal text-[var(--text-tertiary)]">/月</span></div>
            <ul className="text-xs text-[var(--text-secondary)] space-y-1.5 text-left">
              <li className="flex items-center gap-1.5"><span className="text-green-500">✓</span> 全部免费版功能</li>
              <li className="flex items-center gap-1.5"><span className="text-green-500">✓</span> AI 智能识别（图片+文字）</li>
              <li className="flex items-center gap-1.5"><span className="text-green-500">✓</span> 团队协作（无限成员）</li>
              <li className="flex items-center gap-1.5"><span className="text-green-500">✓</span> 数据备份与恢复</li>
              <li className="flex items-center gap-1.5"><span className="text-green-500">✓</span> 优先客服支持</li>
            </ul>
            <button className="mt-4 w-full py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-medium hover:opacity-90 transition-opacity">
              立即升级
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
