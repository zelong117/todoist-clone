import { useState, useMemo, useCallback } from 'react';
import {
  Inbox,
  CalendarDays,
  CalendarClock,
  Plus,
  Search,
  Settings,
  Moon,
  Sun,
  Bell,
  Star,
  Filter,
  Activity,
  BarChart3,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { useStore } from '../store';
import type { Project } from '../types';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string, projectId?: string) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [searchQuery] = useState('');
  const [showFavorites, setShowFavorites] = useState(true);
  const [showProjects, setShowProjects] = useState(true);

  const {
    projects,
    tasks,
    sidebarCollapsed,
    darkMode,
    toggleDarkMode,
    getInboxTasks,
    getTodayTasks,
    getUpcomingTasks,
  } = useStore();

  const inboxCount = useMemo(() => getInboxTasks().length, [tasks]);
  const todayCount = useMemo(() => getTodayTasks().length, [tasks]);
  const upcomingCount = useMemo(() => getUpcomingTasks().length, [tasks]);

  const getProjectTaskCount = useCallback(
    (projectId: string) =>
      tasks.filter((t) => !t.isCompleted && t.projectId === projectId).length,
    [tasks]
  );

  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects;
    return projects.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);

  const favoriteProjects = useMemo(
    () => filteredProjects.filter((p) => p.isFavorite),
    [filteredProjects]
  );

  const totalTasks = useMemo(() => tasks.length, [tasks]);
  const completedTasks = useMemo(
    () => tasks.filter((t) => t.isCompleted).length,
    [tasks]
  );

  const collapsed = sidebarCollapsed;

  return (
    <aside
      className="flex flex-col h-screen transition-all duration-300 ease-in-out select-none relative overflow-hidden bg-[var(--bg-primary)] border-r border-[var(--border-color)]"
      style={{
        width: collapsed ? 56 : 260,
        minWidth: collapsed ? 56 : 260,
      }}
    >
      {/* Header: User info + icons */}
      {!collapsed && (
        <div className="flex items-center justify-between px-3 py-3">
          <button
            onClick={() => onViewChange('inbox')}
            className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg px-2 py-1.5 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
              W
            </div>
            <span className="text-sm font-semibold text-gray-800 dark:text-zinc-100">ww</span>
            <ChevronDown size={14} className="text-gray-400 dark:text-zinc-1000" />
          </button>
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-700 transition-colors"
              title="通知"
            >
              <Bell size={18} />
            </button>
            <button
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-700 transition-colors"
              title="日历"
            >
              <CalendarDays size={18} />
            </button>
          </div>
        </div>
      )}

      {collapsed && (
        <div className="flex flex-col items-center py-3 gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
            W
          </div>
        </div>
      )}

      {/* Add Task Button */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <button
            onClick={() => onViewChange('quick-add')}
            className="flex items-center gap-2 w-full px-3 py-2 bg-[#DC4C3E] hover:bg-[#c4403a] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={18} />
            <span>添加任务</span>
          </button>
        </div>
      )}

      {collapsed && (
        <div className="flex flex-col items-center py-2 gap-2">
          <button
            onClick={() => onViewChange('quick-add')}
            className="p-2 rounded-lg bg-[#DC4C3E] hover:bg-[#c4403a] text-white transition-colors"
            title="添加任务"
          >
            <Plus size={20} />
          </button>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin">
        {/* Search */}
        {!collapsed && (
          <button
            onClick={() => onViewChange('inbox')}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
              currentView === 'search'
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-100'
            }`}
          >
            <Search size={18} className="text-gray-500 flex-shrink-0" />
            <span>搜索</span>
          </button>
        )}

        {/* Smart Views */}
        <div className="space-y-0.5">
          {[
            { id: 'inbox', label: '收件箱', icon: Inbox, count: inboxCount, color: '#0066FF' },
            { id: 'today', label: '今天', icon: CalendarDays, count: todayCount, color: '#058527' },
            { id: 'upcoming', label: '即将到来', icon: CalendarClock, count: upcomingCount, color: '#9B59B6' },
            { id: 'filters', label: '过滤器 & 标签', icon: Filter, count: 0, color: '#6B7280' },
            { id: 'log', label: '日志', icon: Activity, count: 0, color: '#6B7280' },
            { id: 'stats', label: '效率统计', icon: BarChart3, count: 0, color: '#F59E0B' },
          ].map((view) => {
            const Icon = view.icon;
            const isActive = currentView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => onViewChange(view.id)}
                className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-100'
                }`}
                title={collapsed ? view.label : undefined}
              >
                <Icon
                  size={18}
                  className="flex-shrink-0"
                  style={{ color: isActive ? view.color : '#9CA3AF' }}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{view.label}</span>
                    {view.count > 0 && (
                      <span className="text-xs text-gray-400 min-w-[20px] text-center">
                        {view.count}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Favorites Section */}
        {!collapsed && favoriteProjects.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider hover:text-gray-700 transition-colors w-full"
            >
              <Star size={12} className="text-yellow-500" />
              <span>收藏</span>
              <ChevronDown
                size={12}
                className={`ml-auto transition-transform ${showFavorites ? '' : '-rotate-90'}`}
              />
            </button>
            {showFavorites && (
              <div className="space-y-0.5 mt-1">
                {favoriteProjects.map((project: Project) => {
                  const isActive = currentView === `project-${project.id}`;
                  const count = getProjectTaskCount(project.id);
                  return (
                    <button
                      key={project.id}
                      onClick={() => onViewChange(`project-${project.id}`, project.id)}
                      className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-gray-100 text-gray-900 font-medium'
                          : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-100'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="flex-1 text-left truncate">{project.name}</span>
                      {count > 0 && (
                        <span className="text-xs text-gray-400 min-w-[20px] text-center">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* My Projects */}
        <div className="mt-4">
          {!collapsed && (
            <button
              onClick={() => setShowProjects(!showProjects)}
              className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider hover:text-gray-700 transition-colors w-full"
            >
              <span>我的项目</span>
              <span className="text-gray-400 font-normal">
                ({completedTasks}/{totalTasks})
              </span>
              <ChevronDown
                size={12}
                className={`ml-auto transition-transform ${showProjects ? '' : '-rotate-90'}`}
              />
            </button>
          )}

          {showProjects && (
            <div className="space-y-0.5 mt-1">
              {filteredProjects.map((project: Project) => {
                const isActive = currentView === `project-${project.id}`;
                const count = getProjectTaskCount(project.id);
                return (
                  <button
                    key={project.id}
                    onClick={() => onViewChange(`project-${project.id}`, project.id)}
                    className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-100'
                    }`}
                    title={collapsed ? project.name : undefined}
                  >
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{project.name}</span>
                        {count > 0 && (
                          <span className="text-xs text-gray-400 min-w-[20px] text-center">
                            {count}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}

              {/* Add Project Button */}
              {!collapsed && (
                <button
                  onClick={() => {
                    const name = prompt('输入项目名称：');
                    if (name?.trim()) {
                      useStore.getState().addProject({
                        name: name.trim(),
                        color: '#DC4C3E',
                        order: projects.length,
                        isFavorite: false,
                      });
                    }
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Plus size={18} className="text-gray-400" />
                  <span>新建项目</span>
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 px-2 py-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-700 transition-colors"
              title={darkMode ? '浅色模式' : '暗色模式'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => onViewChange('settings')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-700 transition-colors"
              title="设置"
            >
              <Settings size={18} />
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {/* User Status */}
            <div className="flex items-center gap-2 px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-gray-500">在线</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onViewChange('settings')}
                className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-100 transition-colors"
              >
                <HelpCircle size={18} className="text-gray-500" />
                <span>帮助 & 资源</span>
              </button>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-700 transition-colors"
                title={darkMode ? '浅色模式' : '暗色模式'}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                onClick={() => onViewChange('settings')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-700 transition-colors"
                title="设置"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
