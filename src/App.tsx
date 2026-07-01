import { useState, useMemo, useCallback, useEffect } from 'react';
import { useStore } from './store';
import type { Task } from './types';
import { formatTimer } from './utils';
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
import { Inbox, CalendarDays, CalendarClock, LayoutDashboard, List, LayoutGrid, Users, MessageSquare, MoreHorizontal, Activity, Pause, Play } from 'lucide-react';

export default function App() {
  const {
    tasks,
    sections,
    projects,
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
  } = useStore();

  const [currentView, setCurrentView] = useState<string>('inbox');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showPomodoroSettings, setShowPomodoroSettings] = useState(false);
  const [activeFilter, setActiveFilter] = useState<{
    fn: ((task: Task) => boolean) | null;
    label: string;
  }>({ fn: null, label: '' });

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
    }
  }, [currentView, setActiveView, setSelectedProjectId]);

  // Keyboard shortcuts
  useEffect(() => {
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

  const handleViewChange = useCallback((view: string, _projectId?: string) => {
    if (view === 'quick-add') {
      setShowQuickAdd(true);
      return;
    }
    setCurrentView(view);
    setSelectedTaskId(null);
    setActiveFilter({ fn: null, label: '' });
  }, [setSelectedTaskId]);

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

    return baseTasks;
  }, [currentView, tasks, getInboxTasks, getTodayTasks, getUpcomingTasks, getTasksByProject, searchQuery, activeFilter]);

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
    return { totalEstimated, pendingTasks, completedTasks, elapsedTime };
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
      default:
        if (currentProject) return currentProject.name;
        return '所有任务';
    }
  }, [currentView, currentProject, activeFilter.label]);

  const darkClasses = 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';

  // Whether the current view shows a task list (inbox, today, upcoming, projects)
  const isTaskListView = currentView === 'inbox' || currentView === 'today' || currentView === 'upcoming' || currentView.startsWith('project-');

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <Sidebar currentView={currentView} onViewChange={handleViewChange} />

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
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]">
                        <Users size={15} />
                        <span>共享</span>
                      </button>
                    )}

                    {/* 番茄钟开关 - 仅在项目视图显示 */}
                    {currentView.startsWith('project-') && currentProject && (
                      <div className="flex items-center gap-2 px-2">
                        <span className="text-xs text-[var(--text-tertiary)]">🍅 番茄钟</span>
                        <button
                          onClick={() => {
                            useStore.getState().updateProject(currentProject.id, {
                              usePomodoro: !currentProject.usePomodoro,
                            });
                          }}
                          className={`relative w-10 h-5 rounded-full transition-colors ${
                            currentProject.usePomodoro ? 'bg-[var(--accent)]' : 'bg-gray-300'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              currentProject.usePomodoro ? 'translate-x-5' : ''
                            }`}
                          />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center rounded-lg p-0.5 bg-[var(--bg-active)]">
                      {(['list', 'board', 'calendar'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => useStore.getState().setViewMode(mode)}
                          className={`relative z-10 flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                            viewMode === mode
                              ? 'text-white bg-[var(--accent)]'
                              : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                          }`}
                        >
                          {mode === 'list' && <List size={14} />}
                          {mode === 'board' && <LayoutGrid size={14} />}
                          {mode === 'calendar' && <CalendarDays size={14} />}
                          <span>{mode === 'list' ? '列表' : mode === 'board' ? '看板' : '日历'}</span>
                        </button>
                      ))}
                    </div>

                    {currentView.startsWith('project-') && currentProject && (
                      <button className="p-2 rounded-lg transition-colors text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]" title="评论">
                        <MessageSquare size={18} />
                      </button>
                    )}
                  </>
                )}

                <div className="relative">
                  <button 
                    onClick={() => {
                      const menu = document.getElementById('more-menu');
                      if (menu) menu.classList.toggle('hidden');
                    }}
                    className="p-2 rounded-lg transition-colors text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]" title="更多">
                    <MoreHorizontal size={18} />
                  </button>
                  <div id="more-menu" className="hidden absolute right-0 top-full mt-1 w-48 bg-[var(--bg-card)] rounded-lg shadow-lg border border-[var(--border-color)] z-50 py-1">
                    <button className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
                      📋 排序任务
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
                      🔍 过滤任务
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
                      👁 隐藏已完成
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
                      📤 导出任务
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
                      ⚙️ 项目设置
                    </button>
                  </div>
                </div>
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
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
            </div>
          )}

          {/* Content Area */}
          <div className="px-6 py-4">
            {currentView === 'stats' ? (
              <StatsView />
            ) : currentView === 'filter' || currentView === 'filters' ? (
              <FilterPage
                onFilterChange={(fn, label) => setActiveFilter({ fn, label })}
                activeFilterLabel={activeFilter.label}
              />
            ) : currentView === 'log' ? (
              <ActivityLog />
            ) : isTaskListView ? (
              viewMode === 'list' ? (
                <TaskList
                  tasks={viewTasks}
                  sections={currentView.startsWith('project-') ? viewSections : []}
                  projectId={currentProjectId || undefined}
                  viewTitle={viewTitle}
                  showSections={currentView.startsWith('project-') && viewSections.length > 0}
                />
              ) : viewMode === 'board' ? (
                <BoardView tasks={viewTasks} sections={viewSections} />
              ) : (
                <CalendarView tasks={viewTasks} />
              )
            ) : null}
          </div>
        </div>

      </main>

      {/* Task Detail Modal (centered overlay) */}
      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <QuickAdd
            defaultProjectId={currentProjectId || undefined}
            onClose={() => setShowQuickAdd(false)}
          />
        </div>
      )}

      {/* Pomodoro Settings Modal */}
      {showPomodoroSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <PomodoroSettings onClose={() => setShowPomodoroSettings(false)} />
        </div>
      )}

      {/* Pomodoro Timer - fixed at bottom right */}
      <div className="fixed bottom-6 right-6 z-30 max-h-[calc(100vh-48px)] overflow-visible">
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
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)]"
                  >
                    {isRunning ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                </div>
              );
            })()
        ) : (
          <PomodoroTimer />
        )}
      </div>
    </div>
  );
}
