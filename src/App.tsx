import { useState, useMemo, useCallback, useEffect } from 'react';
import { useStore } from './store';
import type { Task } from './types';
import { formatTimer, isOverdue } from './utils';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Sidebar from './components/Sidebar';
import TaskList from './components/TaskList';
import TaskDetail from './components/TaskDetail';
import QuickAdd from './components/QuickAdd';
import PomodoroBar from './components/PomodoroBar';
import PomodoroSettings from './components/PomodoroSettings';
import PomodoroTimer from './components/PomodoroTimer';
import BoardView from './components/BoardView';
import CalendarView from './components/CalendarView';
import StatsView from './components/StatsView';
import FilterPage from './components/FilterPage';
import ActivityLog from './components/ActivityLog';
import Admin from './pages/Admin';
import AIAssistant from './components/AIAssistant';
import DraggableWidget from './components/DraggableWidget';
import SharePanel from './components/SharePanel';
import QuickCapture from './components/QuickCapture';
import ViewOptionsMenu, { DEFAULT_VIEW_OPTIONS } from './components/ViewOptionsMenu';
import type { ViewOptions } from './components/ViewOptionsMenu';
import { initClickSounds } from './utils/sounds';
import { parseRoute, pathForTask, pathForView } from './lib/router';
import { Inbox, CalendarDays, CalendarClock, LayoutDashboard, Users, MessageSquare, MoreHorizontal, Activity, Pause, Play, Settings, Filter, Menu } from 'lucide-react';
import { SkeletonTask } from './components/Skeleton';
import { EmptyState } from './components/EmptyState';

export default function App() {
  const { user, loading, logout } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  
  const {
    tasks,
    sections,
    projects,
    isInitialized,
    selectedTaskId,
    setSelectedTaskId,
    setActiveView,
    setSelectedProjectId,
    viewMode,
    getInboxTasks,
    getTodayTasks,
    getUpcomingTasks,
    getTasksByProject,
    searchQuery,
    darkMode,
    activeTimerTaskId,
    timerSeconds,
    timerMode,
    timerStatus,
    fetchData,
  } = useStore();

  const initialRoute = useMemo(() => parseRoute(window.location.pathname), []);
  const [currentView, setCurrentView] = useState<string>(initialRoute.view);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(initialRoute.sectionId);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showPomodoroSettings, setShowPomodoroSettings] = useState(false);
  const [viewOptions, setViewOptions] = useState<ViewOptions>(DEFAULT_VIEW_OPTIONS);
  const [activeFilter, setActiveFilter] = useState<{
    fn: ((task: Task) => boolean) | null;
    label: string;
  }>({ fn: null, label: '' });

  // Fetch sections from backend when user is logged in
  useEffect(() => {
    if (user) {
      fetchData().catch((error) => console.error('Failed to synchronize data:', error));
      if (initialRoute.taskId) setSelectedTaskId(initialRoute.taskId);
    }
  }, [user, fetchData, initialRoute.taskId, setSelectedTaskId]);

  useEffect(() => {
    const handlePopState = () => {
      const route = parseRoute(window.location.pathname);
      setCurrentView(route.view);
      setSelectedSectionId(route.sectionId);
      setSelectedTaskId(route.taskId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setSelectedTaskId]);

  useEffect(() => {
    if (!selectedTaskId) return;
    const task = tasks.find((item) => item.id === selectedTaskId);
    if (!task) return;
    const path = pathForTask(task.projectId, task.id);
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
  }, [selectedTaskId, tasks]);

  // Sync dark mode to html element for Tailwind dark: prefix
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Sync currentView with store
  useEffect(() => {
    if (currentView === 'inbox') {
      setActiveView('inbox');
      setSelectedProjectId(null);
    } else if (currentView === 'today') {
      setActiveView('today');
      setSelectedProjectId(null);
    } else if (currentView === 'upcoming') {
      setActiveView('upcoming');
      setSelectedProjectId(null);
    } else if (currentView.startsWith('project-')) {
      const pid = currentView.replace('project-', '');
      setActiveView('project');
      setSelectedProjectId(pid);
    } else if (currentView === 'filter' || currentView === 'filters') {
      setActiveView('filter');
    } else if (currentView === 'log') {
      setActiveView('filter');
    } else if (currentView === 'admin') {
      setActiveView('inbox'); // admin doesn't need active view sync
    } else if (currentView === 'settings') {
      setActiveView('inbox'); // settings doesn't need active view sync
    }
  }, [currentView, setActiveView, setSelectedProjectId]);

  // Keyboard shortcuts
  useEffect(() => {
    initClickSounds();
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setShowQuickAdd(true);
      }
      if (e.key === 'Escape') {
        if (showQuickAdd) setShowQuickAdd(false);
        else if (selectedTaskId) setSelectedTaskId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showQuickAdd, selectedTaskId, setSelectedTaskId]);

  // Pomodoro timer - runs in App.tsx so it never unmounts
  useEffect(() => {
    const id = setInterval(() => {
      const state = useStore.getState();
      if (state.timerStatus === 'running') {
        state.tick();
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Recalculate timer when tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const state = useStore.getState();
        if (state.timerStatus === 'running' && state.timerStartedAt) {
          const elapsed = Math.floor(
            (Date.now() - new Date(state.timerStartedAt).getTime()) / 1000
          );
          const remaining = Math.max(0, state.timerSeconds - elapsed);
          if (remaining <= 0) {
            useStore.setState({ timerSeconds: 0, timerStartedAt: null });
            state.completePomodoro();
          } else {
            useStore.setState({ timerSeconds: remaining, timerStartedAt: new Date().toISOString() });
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const handleViewChange = useCallback((view: string, _projectId?: string) => {
    if (view === 'quick-add') {
      setShowQuickAdd(true);
      return;
    }
    setCurrentView(view);
    setSelectedSectionId(null);
    setSelectedTaskId(null);
    setActiveFilter({ fn: null, label: '' });
    const path = pathForView(view);
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
  }, [setSelectedTaskId]);

  const handleSectionChange = useCallback((sectionId: string) => {
    if (!currentView.startsWith('project-')) return;
    setSelectedSectionId(sectionId);
    const path = pathForView(currentView, sectionId);
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
  }, [currentView]);

  const handleTaskClose = useCallback(() => {
    setSelectedTaskId(null);
    const path = pathForView(currentView, selectedSectionId);
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
  }, [currentView, selectedSectionId, setSelectedTaskId]);
  // Handle settings view
  const SettingsPage = () => {
    const { toggleDarkMode, updatePomodoroSettings, pomodoroSettings } = useStore();
    const [notifEnabled, setNotifEnabled] = useState(() => {
      return typeof Notification !== 'undefined' ? Notification.permission === 'granted' : false;
    });
    const [focusMin, setFocusMin] = useState(pomodoroSettings.focusMinutes);
    const [shortBreakMin, setShortBreakMin] = useState(pomodoroSettings.shortBreakMinutes);
    const [longBreakMin, setLongBreakMin] = useState(pomodoroSettings.longBreakMinutes);
    const [longBreakInterval, setLongBreakInterval] = useState(pomodoroSettings.longBreakInterval);
    const [autoStartBreak, setAutoStartBreak] = useState(pomodoroSettings.autoStartBreak);
    const [autoStartPomodoro, setAutoStartPomodoro] = useState(pomodoroSettings.autoStartPomodoro);

    const handleExport = () => {
      const data = {
        tasks: useStore.getState().tasks,
        projects: useStore.getState().projects,
        sections: useStore.getState().sections,
        labels: useStore.getState().labels,
        comments: useStore.getState().comments,
        pomodoroSessions: useStore.getState().pomodoroSessions,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'todoist-backup.json';
      a.click();
      URL.revokeObjectURL(url);
    };

    const handleImport = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const data = JSON.parse(ev.target?.result as string);
            if (data.tasks && data.projects) {
              const store = useStore.getState();
              const existingTaskIds = new Set(store.tasks.map(t => t.id));
              const existingProjectIds = new Set(store.projects.map(p => p.id));
              useStore.setState({
                tasks: [...store.tasks, ...data.tasks.filter((t: any) => !existingTaskIds.has(t.id))],
                projects: [...store.projects, ...data.projects.filter((p: any) => !existingProjectIds.has(p.id))],
              });
              alert('导入成功！');
            } else {
              alert('无效的备份文件格式');
            }
          } catch {
            alert('导入失败');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    };

    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">设置</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">管理你的应用偏好</p>
        </div>

        {/* 主题设置 */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">🎨 主题设置</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">暗色模式</p>
              <p className="text-xs text-[var(--text-tertiary)]">切换浅色/深色主题</p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-[var(--accent)]' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>

        {/* 通知设置 */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">🔔 通知设置</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">浏览器通知</p>
              <p className="text-xs text-[var(--text-tertiary)]">在番茄钟完成时显示通知</p>
            </div>
            <button
              onClick={() => {
                if (!notifEnabled && typeof Notification !== 'undefined') {
                  Notification.requestPermission().then(p => setNotifEnabled(p === 'granted'));
                } else {
                  setNotifEnabled(!notifEnabled);
                }
              }}
              className={`relative w-12 h-6 rounded-full transition-colors ${notifEnabled ? 'bg-[var(--accent)]' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifEnabled ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>

        {/* 番茄钟设置 */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">🍅 番茄钟设置</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-[var(--text-tertiary)]">专注时长（分钟）</label>
                <input type="number" value={focusMin} onChange={(e) => setFocusMin(Number(e.target.value))} min={1} max={120} className="mt-1 w-full px-3 py-2 bg-[var(--bg-active)] border border-[var(--border-color)] rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-tertiary)]">短休息（分钟）</label>
                <input type="number" value={shortBreakMin} onChange={(e) => setShortBreakMin(Number(e.target.value))} min={1} max={30} className="mt-1 w-full px-3 py-2 bg-[var(--bg-active)] border border-[var(--border-color)] rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-tertiary)]">长休息（分钟）</label>
                <input type="number" value={longBreakMin} onChange={(e) => setLongBreakMin(Number(e.target.value))} min={1} max={60} className="mt-1 w-full px-3 py-2 bg-[var(--bg-active)] border border-[var(--border-color)] rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-tertiary)]">长休息间隔（番茄数）</label>
              <input type="number" value={longBreakInterval} onChange={(e) => setLongBreakInterval(Number(e.target.value))} min={1} max={10} className="mt-1 w-full px-3 py-2 bg-[var(--bg-active)] border border-[var(--border-color)] rounded-lg text-sm" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">自动开始休息</span>
              <button onClick={() => setAutoStartBreak(!autoStartBreak)} className={`relative w-12 h-6 rounded-full transition-colors ${autoStartBreak ? 'bg-[var(--accent)]' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoStartBreak ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">自动开始专注</span>
              <button onClick={() => setAutoStartPomodoro(!autoStartPomodoro)} className={`relative w-12 h-6 rounded-full transition-colors ${autoStartPomodoro ? 'bg-[var(--accent)]' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoStartPomodoro ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            <button
              onClick={() => updatePomodoroSettings({ focusMinutes: focusMin, shortBreakMinutes: shortBreakMin, longBreakMinutes: longBreakMin, longBreakInterval, autoStartBreak, autoStartPomodoro })}
              className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors"
            >
              保存番茄钟设置
            </button>
          </div>
        </div>

        {/* 数据管理 */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">💾 数据管理</h2>
          <div className="flex gap-3">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
              📤 导出数据
            </button>
            <button onClick={handleImport} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
              📥 导入数据
            </button>
          </div>
        </div>

        {/* 关于 */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">ℹ️ 关于</h2>
          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            <p>Todoist Clone — 高效任务管理工具</p>
            <p>版本：1.0.0</p>
            <p>技术栈：React + Zustand + Tailwind CSS</p>
          </div>
        </div>
      </div>
    );
  };


  // Get tasks for current view
  const viewTasks = useMemo(() => {
    let baseTasks: Task[];
    switch (currentView) {
      case 'inbox':
        baseTasks = getInboxTasks();
        break;
      case 'today':
        baseTasks = getTodayTasks();
        break;
      case 'upcoming':
        baseTasks = getUpcomingTasks();
        break;
      case 'stats':
        return []; // Stats view doesn't show tasks
      case 'filter':
      case 'filters':
        baseTasks = activeFilter.fn
          ? tasks.filter((t) => !t.isCompleted && activeFilter.fn!(t))
          : tasks.filter((t) => !t.isCompleted);
        break;
      case 'log':
        return []; // Activity log doesn't show task list
      case 'admin':
        return []; // Admin view manages its own data
      case 'settings':
        return []; // Settings view doesn't show tasks
      default:
        if (currentView.startsWith('project-')) {
          const pid = currentView.replace('project-', '');
          baseTasks = getTasksByProject(pid);
        } else {
          baseTasks = tasks.filter((t) => !t.isCompleted);
        }
    }

    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      baseTasks = baseTasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }

    if (selectedSectionId && currentView.startsWith('project-')) {
      baseTasks = baseTasks.filter((task) => task.sectionId === selectedSectionId);
    }

    if (!viewOptions.showCompleted) baseTasks = baseTasks.filter((task) => !task.isCompleted);
    if (viewOptions.priority !== 'all') baseTasks = baseTasks.filter((task) => task.priority === Number(viewOptions.priority));
    if (viewOptions.label) baseTasks = baseTasks.filter((task) => task.labels.includes(viewOptions.label));
    const direction = viewOptions.direction === 'asc' ? 1 : -1;
    baseTasks = [...baseTasks].sort((a, b) => {
      if (viewOptions.sortBy === 'dueDate') return ((a.dueDate || '9999').localeCompare(b.dueDate || '9999')) * direction;
      if (viewOptions.sortBy === 'priority') return (a.priority - b.priority) * direction;
      if (viewOptions.sortBy === 'title') return a.title.localeCompare(b.title, 'zh-CN') * direction;
      return (a.order - b.order) * direction;
    });

    return baseTasks;
  }, [currentView, tasks, getInboxTasks, getTodayTasks, getUpcomingTasks, getTasksByProject, searchQuery, activeFilter, selectedSectionId, viewOptions]);

  const viewSections = useMemo(() => {
    if (currentView.startsWith('project-')) {
      const pid = currentView.replace('project-', '');
      return sections.filter((s) => s.projectId === pid);
    }
    return [];
  }, [currentView, sections]);

  // Stats for the stats bar
  const statsData = useMemo(() => {
    const allTasks = viewTasks;
    const totalEstimated = allTasks.reduce((sum, t) => sum + (t.estimatedMinutes || t.plannedPomodoros * 25 || 0), 0);
    const pendingTasks = allTasks.filter((t) => !t.isCompleted).length;
    const completedTasks = allTasks.filter((t) => t.isCompleted).length;
    const elapsedPomodoros = allTasks.reduce((sum, t) => sum + (t.completedPomodoros || 0), 0);
    const elapsedTime = elapsedPomodoros * 25;
    const overdueTasks = allTasks.filter((t) => isOverdue(t)).length;
    return { totalEstimated, pendingTasks, completedTasks, elapsedTime, overdueTasks };
  }, [viewTasks]);

  const currentProjectId = useMemo(() => {
    if (currentView.startsWith('project-')) {
      return currentView.replace('project-', '');
    }
    return null;
  }, [currentView]);

  const currentProject = useMemo(() => {
    if (!currentProjectId) return null;
    return projects.find((p) => p.id === currentProjectId) || null;
  }, [currentProjectId, projects]);

  // View title
  const viewTitle = useMemo(() => {
    switch (currentView) {
      case 'inbox': return '收件箱';
      case 'today': return '今天';
      case 'upcoming': return '即将到来';
      case 'stats': return '效率统计';
      case 'filter':
      case 'filters': return activeFilter.label || '过滤器 & 标签';
      case 'log': return '日志';
      case 'admin': return '管理后台';
      case 'settings': return '设置';
      default:
        if (currentProject) return currentProject.name;
        return '所有任务';
    }
  }, [currentView, currentProject, activeFilter.label]);

  const darkClasses = 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';

  // Whether the current view shows a task list (inbox, today, upcoming, projects)
  const isTaskListView = currentView === 'inbox' || currentView === 'today' || currentView === 'upcoming' || currentView.startsWith('project-');
  const availableViewLabels = useMemo(() => Array.from(new Set(tasks.flatMap((task) => task.labels))).sort(), [tasks]);

  // 认证检查：加载中显示 loading，未登录显示登录/注册页
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--text-tertiary)]">加载中...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authView === 'register') {
      return (
        <RegisterPage
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }
    return (
      <LoginPage
        onSwitchToRegister={() => setAuthView('register')}
      />
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark' : ''}`}>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setShowMobileMenu(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-md hover:shadow-lg transition-all"
        aria-label="Open menu"
      >
        <Menu size={20} className="text-[var(--text-primary)]" />
      </button>

      {/* Sidebar - desktop always visible, mobile as overlay */}
      <div className="hidden md:block">
        <Sidebar currentView={currentView} onViewChange={handleViewChange} onLogout={logout} onQuickCapture={() => setShowQuickCapture(true)} />
      </div>

      {/* Mobile sidebar overlay */}
      {showMobileMenu && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setShowMobileMenu(false)} />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <Sidebar currentView={currentView} onViewChange={(view) => { handleViewChange(view); setShowMobileMenu(false); }} onLogout={logout} onQuickCapture={() => { setShowQuickCapture(true); setShowMobileMenu(false); }} />
          </div>
        </>
      )}

      {/* Main Content */}
      <main className={`flex-1 flex overflow-hidden ${darkClasses} transition-colors duration-200`}>
        {/* Task List / View Content */}
        <div className="flex-1 overflow-y-auto">
          {/* View Header */}
          <div className="sticky top-0 z-10 border-b backdrop-blur-sm bg-[var(--bg-secondary)] border-[var(--border-color)]">
            {/* Main Header Row */}
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                {currentView === 'inbox' && <Inbox size={22} className="text-blue-500" />}
                {currentView === 'today' && <CalendarDays size={22} className="text-green-500" />}
                {currentView === 'upcoming' && <CalendarClock size={22} className="text-purple-500" />}
                {currentView === 'stats' && <LayoutDashboard size={22} className="text-amber-500" />}
                {currentView === 'log' && <Activity size={22} className="text-[var(--text-tertiary)]" />}
                {currentView === 'admin' && <LayoutDashboard size={22} className="text-indigo-500" />}
                {currentView === 'settings' && <Settings size={22} className="text-gray-500" />}
                {currentProject && (
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: currentProject.color }}
                  />
                )}
                <h1 className="text-2xl font-bold">{viewTitle}</h1>
              </div>

              <div className="flex items-center gap-1">
                {/* View Mode Toggle - show for all task-list views */}
                {isTaskListView && (
                  <>
                    {currentView.startsWith('project-') && currentProject && (
                      <button
                        onClick={() => setShowSharePanel(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
                      >
                        <Users size={15} />
                        <span>共享</span>
                      </button>
                    )}

                    <ViewOptionsMenu
                      viewMode={viewMode}
                      options={viewOptions}
                      labels={availableViewLabels}
                      onViewModeChange={(mode) => useStore.getState().setViewMode(mode)}
                      onOptionsChange={setViewOptions}
                    />

                    {currentView.startsWith('project-') && currentProject && (
                      <button className="p-2 rounded-lg transition-colors text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]" title="评论">
                        <MessageSquare size={18} />
                      </button>
                    )}
                  </>
                )}

                <button className="p-2 rounded-lg transition-colors text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]" title="更多"><MoreHorizontal size={18} /></button>
              </div>
            </div>

            {/* Section Tabs Row (for project views) */}
            {currentView.startsWith('project-') && currentProjectId && viewSections.length > 0 && (
              <div className="flex items-center gap-1 px-6 pb-2 overflow-x-auto">
                {viewSections.map((section) => {
                  const sectionTaskCount = viewTasks.filter((t) => t.sectionId === section.id).length;
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleSectionChange(section.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedSectionId === section.id ? 'bg-[var(--bg-active)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]'}`}
                    >
                      <span>{section.name}</span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        ({sectionTaskCount})
                      </span>
                    </button>
                  );
                })}
                <button
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
                  onClick={() => {
                    useStore.getState().addSection({
                      projectId: currentProjectId,
                      name: '新版本块',
                      order: viewSections.length,
                    });
                  }}
                >
                  <span>+ 添加版块</span>
                </button>
              </div>
            )}
          </div>

          {/* Pomodoro Bar */}
          <PomodoroBar />

          {/* Stats Bar - for task list views */}
          {isTaskListView && viewTasks.length > 0 && (
            <div className="flex items-center gap-4 px-6 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-blue-500/5">
                <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">预计</span>
                <span className="text-sm font-black text-blue-600">{statsData.totalEstimated}m</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-orange-500/5">
                <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">待完成</span>
                <span className="text-sm font-black text-orange-600">{statsData.pendingTasks}</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-purple-500/5">
                <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">已用</span>
                <span className="text-sm font-black text-purple-600">{statsData.elapsedTime}m</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-emerald-500/5">
                <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">已完成</span>
                <span className="text-sm font-black text-emerald-600">{statsData.completedTasks}</span>
              </div>
              {statsData.overdueTasks > 0 && (
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20">
                  <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">已过期</span>
                  <span className="text-sm font-black text-red-600">{statsData.overdueTasks}</span>
                </div>
              )}
            </div>
          )}

          {isTaskListView && statsData.overdueTasks > 0 && (
            <div className="mx-6 mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
              ⚠️ 有 {statsData.overdueTasks} 个任务已过期。已在今天视图中保留显示，请尽快重新安排日期或完成任务。
            </div>
          )}

          {/* Content Area */}
          <div className="px-6 py-4">
            {/* View-specific descriptions */}
            {currentView === 'inbox' && viewTasks.length > 0 && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3 text-sm">
                <Inbox size={16} className="text-blue-500 flex-shrink-0" />
                <span className="text-[var(--text-secondary)]">
                  收件箱显示所有<strong className="text-[var(--text-primary)]">未分配项目</strong>的任务。将任务分配到项目以更好地组织它们。
                </span>
              </div>
            )}
            {currentView === 'upcoming' && viewTasks.length > 0 && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center gap-3 text-sm">
                <CalendarClock size={16} className="text-purple-500 flex-shrink-0" />
                <span className="text-[var(--text-secondary)]">
                  未来<strong className="text-[var(--text-primary)]">7天</strong>内到期的任务，按日期排序。点击日历视图可查看更全面的日程。
                </span>
              </div>
            )}
            {(currentView === 'filter' || currentView === 'filters') && viewTasks.length > 0 && activeFilter.label && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-orange-500/5 border border-orange-500/10 flex items-center gap-3 text-sm">
                <Filter size={16} className="text-orange-500 flex-shrink-0" />
                <span className="text-[var(--text-secondary)]">
                  当前筛选: <strong className="text-[var(--text-primary)]">{activeFilter.label}</strong>
                  {' '}— 共 <strong className="text-[var(--text-primary)]">{viewTasks.length}</strong> 个任务匹配
                </span>
              </div>
            )}

            {currentView === 'stats' ? (
              <StatsView />
            ) : currentView === 'filter' || currentView === 'filters' ? (
              <FilterPage
                onFilterChange={(fn, label) => setActiveFilter({ fn, label })}
                activeFilterLabel={activeFilter.label}
              />
            ) : currentView === 'log' ? (
              <ActivityLog />
            ) : currentView === 'admin' ? (
              <Admin />
            ) : currentView === 'settings' ? (
              <SettingsPage />
            ) : isTaskListView ? (
              !isInitialized ? (
                <SkeletonTask count={8} />
              ) : viewTasks.length === 0 ? (
                <EmptyState
                  type={currentView === 'inbox' ? 'inbox' : currentView === 'today' ? 'today' : currentView === 'upcoming' ? 'upcoming' : currentView.startsWith('project-') ? 'project' : 'filter'}
                  onAction={() => setShowQuickAdd(true)}
                />
              ) : viewMode === 'list' ? (
                <TaskList
                  tasks={viewTasks}
                  sections={currentView.startsWith('project-') ? viewSections : []}
                  projectId={currentProjectId || undefined}
                  viewTitle={viewTitle}
                  viewType={
                    currentView === 'inbox' ? 'inbox' :
                    currentView === 'today' ? 'today' :
                    currentView === 'upcoming' ? 'upcoming' :
                    currentView.startsWith('project-') ? 'project' :
                    'filter'
                  }
                  showSections={currentView.startsWith('project-') && viewSections.length > 0 && viewOptions.groupBy === 'section'}
                />
              ) : viewMode === 'board' ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <BoardView tasks={viewTasks} sections={viewSections} projectId={currentProjectId || undefined} />
                </div>
              ) : (
                <CalendarView tasks={viewTasks} />
              )
            ) : null}
          </div>
        </div>

        {/* AI Assistant Panel */}
        <AIAssistant />

        {/* 共享面板 */}
        {showSharePanel && currentProject && (
          <SharePanel
            projectId={currentProject.id}
            projectName={currentProject.name}
            onClose={() => setShowSharePanel(false)}
          />
        )}

        {/* 快速录入 */}
        {showQuickCapture && (
          <QuickCapture onClose={() => setShowQuickCapture(false)} />
        )}

      </main>

      {/* Task Detail Modal (centered overlay) */}
      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          onClose={handleTaskClose}
        />
      )}

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center max-md:items-stretch bg-black/50 backdrop-blur-sm">
          <QuickAdd
            defaultProjectId={currentProjectId || undefined}
            onClose={() => setShowQuickAdd(false)}
          />
        </div>
      )}

      {/* Pomodoro Settings Modal */}
      {showPomodoroSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center max-md:items-stretch bg-black/50 backdrop-blur-sm">
          <PomodoroSettings onClose={() => setShowPomodoroSettings(false)} />
        </div>
      )}

      {/* Pomodoro Timer - draggable */}
      {timerStatus !== 'idle' && (
      <DraggableWidget initialRight={24} initialBottom={24} zIndex={30}>
        <div className="max-h-[calc(100vh-48px)] overflow-visible">
        {activeTimerTaskId ? (
            // Mini timer when a task timer is active
            (() => {
              const isRunning = timerStatus === 'running';
              const isPaused = timerStatus === 'paused';
              const MODE_LABELS: Record<string, string> = {
                focus: '专注中',
                shortBreak: '短休息',
                longBreak: '长休息',
              };
              const statusText = isRunning ? MODE_LABELS[timerMode] : isPaused ? '已暂停' : '准备开始';
              const currentTaskName = activeTimerTaskId
                ? tasks.find((t) => t.id === activeTimerTaskId)?.title || '未知任务'
                : '';
              return (
                <div className="flex items-center gap-3 bg-[var(--bg-card)] rounded-xl shadow-xl px-5 py-3 border border-[var(--border-color)]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#DC4C3E] to-[#B83A2E] flex items-center justify-center">
                    <span className="text-white text-sm">🍅</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{currentTaskName}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{statusText}</p>
                  </div>
                  <span className="text-lg font-mono font-bold text-[var(--accent)]">{formatTimer(timerSeconds)}</span>
                  <button
                    onClick={() => {
                      if (isRunning) useStore.getState().pauseTimer();
                      else useStore.getState().resumeTimer();
                    }}
                    className="w-10 h-10 rounded-full bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
                    title={isRunning ? '暂停' : '继续'}
                  >
                    {isRunning ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
                  </button>
                </div>
              );
            })()
        ) : (
          <PomodoroTimer />
        )}
        </div>
      </DraggableWidget>
      )}
    </div>
  );
}
