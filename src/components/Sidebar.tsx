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
  Folder,
  LayoutDashboard,
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
    { id: 'inbox', label: '收件箱', icon: Inbox, count: inboxCount, color: 'text-blue-400' },
    { id: 'today', label: '今天', icon: CalendarDays, count: todayCount, color: 'text-green-400' },
    { id: 'upcoming', label: '即将到来', icon: CalendarClock, count: upcomingCount, color: 'text-purple-400' },
  ];

  const collapsed = sidebarCollapsed;

  return (
    <aside
      className="flex flex-col h-screen transition-all duration-300 ease-in-out select-none"
      style={{
        width: collapsed ? 56 : 260,
        minWidth: collapsed ? 56 : 260,
        backgroundColor: '#1a1a2e',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-[#DC4C3E]" />
            <span className="text-white font-bold text-lg tracking-tight">Todoist</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Search & Quick Add */}
      {!collapsed && (
        <div className="px-3 py-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white/10 text-white placeholder-gray-500 rounded-lg text-sm border border-transparent focus:border-[#DC4C3E]/50 focus:outline-none transition-colors"
            />
          </div>
          <button
            onClick={() => onViewChange('quick-add')}
            className="flex items-center gap-2 w-full px-3 py-2 bg-[#DC4C3E] hover:bg-[#c4403a] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
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
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="搜索"
          >
            <Search size={18} />
          </button>
          <button
            onClick={() => onViewChange('quick-add')}
            className="p-2 rounded-lg bg-[#DC4C3E] hover:bg-[#c4403a] text-white transition-colors"
            title="快速添加任务"
          >
            <Plus size={18} />
          </button>
        </div>
      )}

      {/* Smart Views */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-0.5">
          {smartViews.map((view) => {
            const Icon = view.icon;
            const isActive = currentView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => onViewChange(view.id)}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
                title={collapsed ? view.label : undefined}
              >
                <Icon size={18} className={isActive ? view.color : 'text-gray-500'} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{view.label}</span>
                    {view.count > 0 && (
                      <span className="px-1.5 py-0.5 text-xs rounded-full bg-white/10 text-gray-400 min-w-[20px] text-center">
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
          className={`flex items-center gap-3 w-full px-3 py-2 mt-1 rounded-lg text-sm transition-all ${
            currentView === 'stats'
              ? 'bg-white/15 text-white'
              : 'text-gray-300 hover:bg-white/10 hover:text-white'
          }`}
          title={collapsed ? '效率统计' : undefined}
        >
          <LayoutDashboard size={18} className={currentView === 'stats' ? 'text-amber-400' : 'text-gray-500'} />
          {!collapsed && <span className="flex-1 text-left">效率统计</span>}
        </button>

        {/* Divider */}
        <div className="my-3 border-t border-white/10" />

        {/* Projects */}
        {!collapsed && (
          <div className="px-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">项目</span>
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
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
                title={collapsed ? project.name : undefined}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{project.name}</span>
                    {count > 0 && (
                      <span className="px-1.5 py-0.5 text-xs rounded-full bg-white/10 text-gray-400 min-w-[20px] text-center">
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
            className="flex items-center gap-3 w-full px-3 py-2 mt-1 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <Plus size={16} />
            <span>新建项目</span>
          </button>
        )}

        {collapsed && (
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
            className="flex items-center justify-center w-full py-2 mt-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            title="新建项目"
          >
            <Folder size={18} />
          </button>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-2 py-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title={darkMode ? '浅色模式' : '暗色模式'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => onViewChange('settings')}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="设置"
            >
              <Settings size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onViewChange('settings')}
              className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <Settings size={16} />
              <span>设置</span>
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title={darkMode ? '浅色模式' : '暗色模式'}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
