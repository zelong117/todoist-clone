import { useState, useMemo, useCallback, useEffect } from 'react';
import { useStore } from './store';
import type { Task } from './types';
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
import { Inbox, CalendarDays, CalendarClock, LayoutDashboard, List, LayoutGrid, Users, MessageSquare, MoreHorizontal, Activity } from 'lucide-react';

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

  const darkClasses = darkMode ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]' : 'bg-gray-50 text-gray-900';

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
          <div className={`sticky top-0 z-10 border-b backdrop-blur-sm ${
            darkMode
              ? 'bg-[var(--bg-secondary)] border-[var(--border-color)]'
              : 'bg-white/80 border-gray-200'
          }`}>
            {/* Main Header Row */}
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                {currentView === 'inbox' && <Inbox size={22} className="text-blue-500" />}
                {currentView === 'today' && <CalendarDays size={22} className="text-green-500" />}
                {currentView === 'upcoming' && <CalendarClock size={22} className="text-purple-500" />}
                {currentView === 'stats' && <LayoutDashboard size={22} className="text-amber-500" />}
                {currentView === 'log' && <Activity size={22} className="text-gray-500" />}
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
                      <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        darkMode ? 'text-gray-400 dark:text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'
                      }`}>
                        <Users size={15} />
                        <span>共享</span>
                      </button>
                    )}

                    <div className={`flex items-center rounded-lg p-0.5 ${
                      darkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      {(['list', 'board', 'calendar'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => useStore.getState().setViewMode(mode)}
                          className={`relative z-10 flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                            viewMode === mode
                              ? darkMode
                                ? 'text-white bg-gray-600'
                                : 'text-white bg-[#DC4C3E]'
                              : darkMode
                                ? 'text-gray-400 dark:text-gray-300 hover:text-gray-200'
                                : 'text-gray-500 hover:text-gray-700'
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
                      <button className={`p-2 rounded-lg transition-colors ${
                        darkMode ? 'text-gray-400 dark:text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'
                      }`} title="评论">
                        <MessageSquare size={18} />
                      </button>
                    )}
                  </>
                )}

                <button className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'text-gray-400 dark:text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'
                }`} title="更多">
                  <MoreHorizontal size={18} />
                </button>
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        darkMode
                          ? 'text-gray-400 dark:text-gray-300 hover:bg-gray-700 hover:text-gray-200'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      }`}
                    >
                      <span>{section.name}</span>
                      <span className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400 dark:text-gray-300'}`}>
                        ({sectionTaskCount})
                      </span>
                    </button>
                  );
                })}
                <button
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    darkMode
                      ? 'text-gray-500 hover:bg-gray-700 hover:text-gray-300'
                      : 'text-gray-400 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-600'
                  }`}
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
      <div className="fixed bottom-4 right-4 z-30">
        <PomodoroTimer />
      </div>
    </div>
  );
}
