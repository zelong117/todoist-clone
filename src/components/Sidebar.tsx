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
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  BarChart3,
} from 'lucide-react';
import { useStore } from '../store';
import type { Project } from '../types';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string, projectId?: string) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const {
    projects,
    tasks,
    sidebarCollapsed,
    toggleSidebar,
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

  const smartViews = [
    { id: 'inbox', label: '收件箱', icon: Inbox, count: inboxCount, color: 'text-[#0066FF]', activeBar: '#0066FF' },
    { id: 'today', label: '今天', icon: CalendarDays, count: todayCount, color: 'text-[#058527]', activeBar: '#058527' },
    { id: 'upcoming', label: '即将到来', icon: CalendarClock, count: upcomingCount, color: 'text-[#9B59B6]', activeBar: '#9B59B6' },
  ];

  const collapsed = sidebarCollapsed;

  return (
    <aside
      className="flex flex-col h-screen transition-all duration-300 ease-in-out select-none relative overflow-hidden"
      style={{
        width: collapsed ? 56 : 260,
        minWidth: collapsed ? 56 : 260,
        background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a3e 100%)',
      }}
    >
      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Header with glass effect */}
      <div className="relative flex items-center justify-between px-3 py-4 backdrop-blur-sm border-b border-white/5">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#DC4C3E] to-[#B83A2E] flex items-center justify-center shadow-lg shadow-[#DC4C3E]/20">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Todoist</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200"
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Search & Quick Add */}
      {!collapsed && (
        <div className="px-3 py-3 space-y-2">
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#DC4C3E] transition-colors" />
            <input
              type="text"
              placeholder="搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white/5 text-white placeholder-gray-500 rounded-lg text-[13px] border border-white/10 focus:border-[#DC4C3E]/50 focus:bg-white/10 focus:outline-none transition-all duration-200"
            />
          </div>
          <button
            onClick={() => onViewChange('quick-add')}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-gradient-to-r from-[#DC4C3E] to-[#c4403a] hover:from-[#c4403a] hover:to-[#B83A2E] text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-md shadow-[#DC4C3E]/20 hover:shadow-lg hover:shadow-[#DC4C3E]/30"
          >
            <Plus size={20} />
            <span>快速添加</span>
          </button>
        </div>
      )}

      {collapsed && (
        <div className="flex flex-col items-center py-3 gap-2">
          <button
            onClick={() => {
              toggleSidebar();
            }}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200"
            title="搜索"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => onViewChange('quick-add')}
            className="p-2 rounded-lg bg-gradient-to-br from-[#DC4C3E] to-[#c4403a] hover:from-[#c4403a] hover:to-[#B83A2E] text-white transition-all duration-200 shadow-md shadow-[#DC4C3E]/20"
            title="快速添加任务"
          >
            <Plus size={20} />
          </button>
        </div>
      )}

      {/* Smart Views */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
        <div className="space-y-0.5">
          {smartViews.map((view) => {
            const Icon = view.icon;
            const isActive = currentView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => onViewChange(view.id)}
                className={`group flex items-center gap-3.5 w-full px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
                title={collapsed ? view.label : undefined}
              >
                {/* Active indicator bar - colored per view type */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full shadow-sm"
                    style={{
                      backgroundColor: view.activeBar,
                      boxShadow: `0 0 8px ${view.activeBar}40`,
                    }}
                  />
                )}
                <Icon size={20} className={`transition-colors duration-200 ${isActive ? view.color : 'text-gray-500 group-hover:text-gray-400'}`} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{view.label}</span>
                    {view.count > 0 && (
                      <span className={`px-2 py-0.5 text-[11px] rounded-full min-w-[22px] text-center transition-colors duration-200 ${
                        isActive ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-500'
                      }`}>
                        {view.count}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Stats Link */}
        <button
          onClick={() => onViewChange('stats')}
          className={`group flex items-center gap-3.5 w-full px-3 py-2.5 mt-1 rounded-lg text-sm transition-all duration-200 relative ${
            currentView === 'stats'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
          title={collapsed ? '效率统计' : undefined}
        >
          {currentView === 'stats' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gray-400 rounded-r-full shadow-sm shadow-gray-400/50" />
          )}
          <BarChart3 size={20} className={`transition-colors duration-200 ${currentView === 'stats' ? 'text-gray-500' : 'text-gray-500 group-hover:text-gray-400'}`} />
          {!collapsed && <span className="flex-1 text-left">效率统计</span>}
        </button>

        {/* Divider */}
        <div className="my-3 border-t border-white/5" />

        {/* Projects */}
        {!collapsed && (
          <div className="px-2 mb-2">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">项目</span>
          </div>
        )}

        <div className="space-y-0.5">
          {filteredProjects.map((project: Project) => {
            const isActive = currentView === `project-${project.id}`;
            const count = getProjectTaskCount(project.id);
            return (
              <button
                key={project.id}
                onClick={() => onViewChange(`project-${project.id}`, project.id)}
                className={`group flex items-center gap-3.5 w-full px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
                title={collapsed ? project.name : undefined}
              >
                {/* Active indicator bar - project color */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full shadow-sm"
                    style={{
                      backgroundColor: project.color,
                      boxShadow: `0 0 8px ${project.color}40`,
                    }}
                  />
                )}
                <span
                  className={`w-3 h-3 rounded-full flex-shrink-0 transition-all duration-200 ${
                    isActive ? 'shadow-sm' : 'opacity-70 group-hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: project.color,
                    boxShadow: isActive ? `0 0 8px ${project.color}60` : 'none',
                  }}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{project.name}</span>
                    {count > 0 && (
                      <span className={`px-2 py-0.5 text-[11px] rounded-full min-w-[22px] text-center transition-colors duration-200 ${
                        isActive ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-500'
                      }`}>
                        {count}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* New Project */}
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
          className={`flex items-center gap-3.5 w-full px-3 py-2.5 mt-1 rounded-lg text-sm text-gray-500 hover:text-white border border-dashed border-white/10 hover:border-white/30 hover:bg-white/5 transition-all duration-200 ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? '新建项目' : undefined}
        >
          <Plus size={20} className="opacity-60" />
          {!collapsed && <span>新建项目</span>}
        </button>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 px-2 py-2 backdrop-blur-sm">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200"
              title={darkMode ? '浅色模式' : '暗色模式'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => onViewChange('settings')}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200"
              title="设置"
            >
              <Settings size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onViewChange('settings')}
              className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              <Settings size={20} />
              <span>设置</span>
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200"
              title={darkMode ? '浅色模式' : '暗色模式'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
