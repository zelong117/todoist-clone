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
  Timer,
} from 'lucide-react';
import { useStore } from '../store';
import type { Project } from '../types';
import NewProjectModal from './NewProjectModal';
import ProjectSettingsModal from './ProjectSettingsModal';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string, projectId?: string) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [searchQuery] = useState('');
  const [showFavorites, setShowFavorites] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState<string | null>(null);

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
    <>
    <aside
      className="flex flex-col h-screen transition-all duration-300 ease-in-out select-none relative overflow-hidden bg-[var(--bg-primary)] border-r border-[var(--border-color)]"
      style={{
        width: collapsed ? 56 : 260,
        minWidth: collapsed ? 56 : 260,
      }}
    >
      {/* Header: Logo + User info + icons */}
      {!collapsed && (
        <div className="relative px-3 pt-4 pb-3">
          {/* Gradient glass header background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 via-purple-500/5 to-transparent backdrop-blur-xl" />
          <div className="relative flex items-center justify-between">
            <button
              onClick={() => onViewChange('inbox')}
              className="flex items-center gap-2.5 hover:bg-[var(--bg-active)] rounded-xl px-2.5 py-2 transition-all duration-200 group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
                W
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-bold text-[var(--text-primary)] tracking-tight">ww</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-500 font-medium">在线</span>
                </div>
              </div>
              <ChevronDown size={14} className="text-[var(--text-tertiary)] ml-1" />
            </button>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onViewChange('upcoming')}
                className="p-2 rounded-xl hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-all duration-200"
                title="通知"
              >
                <Bell size={18} />
              </button>
              <button
                onClick={() => onViewChange('upcoming')}
                className="p-2 rounded-xl hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-all duration-200"
                title="日历"
              >
                <CalendarDays size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {collapsed && (
        <div className="flex flex-col items-center py-3 gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/25">
            W
          </div>
        </div>
      )}

      {/* Add Task Button */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <button
            onClick={() => onViewChange('quick-add')}
            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-gradient-to-r from-[#DC4C3E] to-[#E85D4A] hover:from-[#c4403a] hover:to-[#D45040] text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>添加任务</span>
          </button>
        </div>
      )}

      {collapsed && (
        <div className="flex flex-col items-center py-2 gap-2">
          <button
            onClick={() => onViewChange('quick-add')}
            className="p-2.5 rounded-xl bg-gradient-to-r from-[#DC4C3E] to-[#E85D4A] hover:from-[#c4403a] hover:to-[#D45040] text-white transition-all duration-200 shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30"
            title="添加任务"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-1 scrollbar-thin">
        {/* Search */}
        {!collapsed && (
          <button
            onClick={() => onViewChange('inbox')}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              currentView === 'search'
                ? 'bg-[var(--bg-active)] text-[var(--text-primary)] font-semibold shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-active)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Search size={18} className="text-[var(--text-tertiary)] flex-shrink-0" />
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
              <div key={view.id} className="relative">
                {/* Colored indicator bar */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full transition-all duration-200"
                    style={{ backgroundColor: view.color }}
                  />
                )}
                <button
                  onClick={() => onViewChange(view.id)}
                  className={`group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--bg-active)] text-[var(--text-primary)] font-semibold shadow-sm'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-active)] hover:text-[var(--text-primary)]'
                  }`}
                  title={collapsed ? view.label : undefined}
                >
                  <Icon
                    size={18}
                    className="flex-shrink-0 transition-colors duration-200"
                    style={{ color: isActive ? view.color : '#9CA3AF' }}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{view.label}</span>
                      {view.count > 0 && (
                        <span className="text-[11px] font-bold min-w-[22px] h-[22px] flex items-center justify-center rounded-full px-1.5" style={{ backgroundColor: `${view.color}18`, color: view.color }}>
                          {view.count}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Favorites Section */}
        {!collapsed && favoriteProjects.length > 0 && (
          <div className="mt-5">
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest hover:text-[var(--text-secondary)] transition-colors w-full"
            >
              <Star size={12} className="text-yellow-500 fill-yellow-500" />
              <span>收藏</span>
              <ChevronDown
                size={12}
                className={`ml-auto transition-transform duration-200 ${showFavorites ? '' : '-rotate-90'}`}
              />
            </button>
            {showFavorites && (
              <div className="space-y-0.5 mt-1">
                {favoriteProjects.map((project: Project) => {
                  const isActive = currentView === `project-${project.id}`;
                  const count = getProjectTaskCount(project.id);
                  return (
                    <div key={project.id} className="relative">
                      {isActive && (
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                          style={{ backgroundColor: project.color }}
                        />
                      )}
                      <button
                        onClick={() => onViewChange(`project-${project.id}`, project.id)}
                        className={`group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                          isActive
                            ? 'bg-[var(--bg-active)] text-[var(--text-primary)] font-semibold shadow-sm'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-active)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-[4px] flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="flex-1 text-left truncate font-medium">{project.name}</span>
                        {project.usePomodoro && (
                          <span title="番茄钟已启用"><Timer size={12} className="text-[#DC4C3E] flex-shrink-0" /></span>
                        )}
                        {count > 0 && (
                          <span className="text-[11px] font-bold text-[var(--text-secondary)] min-w-[22px] h-[22px] flex items-center justify-center bg-[var(--bg-active)] rounded-full px-1.5">
                            {count}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* My Projects */}
        <div className="mt-5">
          {!collapsed && (
            <button
              onClick={() => setShowProjects(!showProjects)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest hover:text-[var(--text-secondary)] transition-colors w-full"
            >
              <span>我的项目</span>
              <span className="text-[var(--text-tertiary)] font-normal text-[10px]">
                ({completedTasks}/{totalTasks})
              </span>
              <ChevronDown
                size={12}
                className={`ml-auto transition-transform duration-200 ${showProjects ? '' : '-rotate-90'}`}
              />
            </button>
          )}

          {showProjects && (
            <div className="space-y-0.5 mt-1">
              {filteredProjects.map((project: Project) => {
                const isActive = currentView === `project-${project.id}`;
                const count = getProjectTaskCount(project.id);
                return (
                  <div key={project.id} className="relative group/item">
                    {isActive && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full z-10"
                        style={{ backgroundColor: project.color }}
                      />
                    )}
                    <button
                      onClick={() => onViewChange(`project-${project.id}`, project.id)}
                      className={`group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                        isActive
                          ? 'bg-[var(--bg-active)] text-[var(--text-primary)] font-semibold shadow-sm'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-active)] hover:text-[var(--text-primary)]'
                      }`}
                      title={collapsed ? project.name : undefined}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-[4px] flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: project.color }}
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left truncate font-medium">{project.name}</span>
                          {project.usePomodoro && (
                            <span title="番茄钟已启用"><Timer size={12} className="text-[#DC4C3E] flex-shrink-0" /></span>
                          )}
                          {count > 0 && (
                            <span className="text-[11px] font-bold text-[var(--text-secondary)] min-w-[22px] h-[22px] flex items-center justify-center bg-[var(--bg-active)] rounded-full px-1.5">
                              {count}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                    {!collapsed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowProjectSettings(project.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover/item:opacity-100 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all duration-200"
                        title="项目设置"
                      >
                        <Settings size={14} />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Add Project Button */}
              {!collapsed && (
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-active)] transition-all duration-200"
                >
                  <Plus size={18} className="text-[var(--text-tertiary)]" />
                  <span>新建项目</span>
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--border-color)] px-2.5 py-2.5">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-all duration-200"
              title={darkMode ? '浅色模式' : '暗色模式'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => onViewChange('settings')}
              className="p-2.5 rounded-xl hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-all duration-200"
              title="设置"
            >
              <Settings size={18} />
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {/* User Status Bar */}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/5 to-transparent">
              <div className="relative">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                  W
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[var(--bg-primary)]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[var(--text-primary)]">ww</span>
                <span className="text-[10px] text-emerald-500 font-medium">在线</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onViewChange('settings')}
                className="flex items-center gap-2.5 flex-1 px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-active)] transition-all duration-200"
              >
                <HelpCircle size={18} className="text-[var(--text-tertiary)]" />
                <span>帮助 & 资源</span>
              </button>
              <button
                onClick={toggleDarkMode}
                className="p-2.5 rounded-xl hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-all duration-200"
                title={darkMode ? '浅色模式' : '暗色模式'}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                onClick={() => onViewChange('settings')}
                className="p-2.5 rounded-xl hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-all duration-200"
                title="设置"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>

    {/* New Project Modal */}
    {showNewProjectModal && (
      <NewProjectModal onClose={() => setShowNewProjectModal(false)} />
    )}

    {/* Project Settings Modal */}
    {showProjectSettings && (
      <ProjectSettingsModal
        projectId={showProjectSettings}
        onClose={() => setShowProjectSettings(null)}
      />
    )}
    </>
  );
}
