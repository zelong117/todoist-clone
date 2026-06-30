import { useState, useMemo, useCallback, useEffect } from 'react';
import { useStore } from './store';
import type { Task } from './types';
import Sidebar from './components/Sidebar';
import TaskList from './components/TaskList';
import TaskDetail from './components/TaskDetail';
import QuickAdd from './components/QuickAdd';

import BoardView from './components/BoardView';
import CalendarView from './components/CalendarView';
import StatsView from './components/StatsView';
import FilterPanel from './components/FilterPanel';
import { Inbox, CalendarDays, CalendarClock, LayoutDashboard } from 'lucide-react';

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
  const [activeFilter, setActiveFilter] = useState<{
    fn: ((task: Task) => boolean) | null;
    label: string;
  }>({ fn: null, label: '' });

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
    } else if (currentView === 'filter') {
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
    // Apply search filter first
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
        baseTasks = activeFilter.fn
          ? tasks.filter((t) => !t.isCompleted && activeFilter.fn!(t))
          : tasks.filter((t) => !t.isCompleted);
        break;
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
      case 'filter': return activeFilter.label || '过滤器';
      default:
        if (currentProject) return currentProject.name;
        return '所有任务';
    }
  }, [currentView, currentProject, activeFilter.label]);

  const darkClasses = darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900';

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <Sidebar currentView={currentView} onViewChange={handleViewChange} />

      {/* Main Content */}
      <main className={`flex-1 flex overflow-hidden ${darkClasses} transition-colors duration-200`}>
        {/* Task List / View Content */}
        <div className="flex-1 overflow-y-auto">
          {/* View Header */}
          <div className={`sticky top-0 z-10 px-6 py-4 border-b backdrop-blur-sm ${
            darkMode
              ? 'bg-gray-900/80 border-gray-700'
              : 'bg-white/80 border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentView === 'inbox' && <Inbox size={22} className="text-blue-500" />}
                {currentView === 'today' && <CalendarDays size={22} className="text-green-500" />}
                {currentView === 'upcoming' && <CalendarClock size={22} className="text-purple-500" />}
                {currentView === 'stats' && <LayoutDashboard size={22} className="text-amber-500" />}
                {currentProject && (
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: currentProject.color }}
                  />
                )}
                <h1 className="text-xl font-bold">{viewTitle}</h1>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {currentView !== 'stats' && `${viewTasks.length} 个任务`}
                </span>
              </div>

              {/* View Mode Toggle (only for project view) */}
              {currentView.startsWith('project-') && currentProject && (
                <div className={`flex items-center gap-1 rounded-lg p-1 ${
                  darkMode ? 'bg-gray-800' : 'bg-gray-100'
                }`}>
                  {(['list', 'board', 'calendar'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => useStore.getState().setViewMode(mode)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        viewMode === mode
                          ? 'bg-[#DC4C3E] text-white shadow-sm'
                          : darkMode
                            ? 'text-gray-400 hover:text-white'
                            : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {mode === 'list' ? '列表' : mode === 'board' ? '看板' : '日历'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Panel (for filter view) */}
            {currentView === 'filter' && (
              <FilterPanel
                onFilterChange={(fn, label) => setActiveFilter({ fn, label })}
                activeFilterLabel={activeFilter.label}
              />
            )}
          </div>

          {/* Content Area */}
          <div className="px-6 py-4">
            {currentView === 'stats' ? (
              <StatsView />
            ) : currentView.startsWith('project-') && currentProjectId ? (
              viewMode === 'list' ? (
                <TaskList
                  tasks={viewTasks}
                  sections={viewSections}
                  projectId={currentProjectId}
                  viewTitle={viewTitle}
                  showSections
                />
              ) : viewMode === 'board' ? (
                <BoardView tasks={viewTasks} sections={viewSections} />
              ) : (
                <CalendarView tasks={viewTasks} />
              )
            ) : (
              <TaskList
                tasks={viewTasks}
                viewTitle={viewTitle}
              />
            )}
          </div>
        </div>

        {/* Task Detail Panel (right side) */}
        {selectedTaskId && (
          <div className={`w-[380px] min-w-[380px] border-l overflow-y-auto ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <TaskDetail
              taskId={selectedTaskId}
              onClose={() => setSelectedTaskId(null)}
            />
          </div>
        )}
      </main>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <QuickAdd
            defaultProjectId={currentProjectId || undefined}
            onClose={() => setShowQuickAdd(false)}
          />
        </div>
      )}
    </div>
  );
}
