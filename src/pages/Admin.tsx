import { useState, useMemo, useRef } from 'react';
import { useStore } from '../store';
import type { Task, Project } from '../types';
import { Search, Download, Upload, Trash2, ArrowUpDown, Clock, CheckCircle, Circle } from 'lucide-react';

export default function Admin() {
  const { tasks, projects, sections, labels, comments, pomodoroSessions } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [taskSearch, setTaskSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Stats
  const stats = useMemo(() => ({
    totalTasks: tasks.length,
    totalProjects: projects.length,
    totalLabels: labels.length,
    totalPomodoros: pomodoroSessions.length,
  }), [tasks, projects, labels, pomodoroSessions]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    
    // Search filter
    if (taskSearch) {
      const q = taskSearch.toLowerCase();
      result = result.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
    }
    
    // Status filter
    if (taskFilter === 'pending') {
      result = result.filter((t) => !t.isCompleted);
    } else if (taskFilter === 'completed') {
      result = result.filter((t) => t.isCompleted);
    }
    
    return result;
  }, [tasks, taskSearch, taskFilter]);

  // Get project name by id
  const getProjectName = (projectId: string | null) => {
    if (!projectId) return '收件箱';
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : '未知项目';
  };

  // Get project color by id
  const getProjectColor = (projectId: string | null) => {
    if (!projectId) return '#9CA3AF';
    const project = projects.find((p) => p.id === projectId);
    return project ? project.color : '#9CA3AF';
  };

  // Get task title by id
  const getTaskTitle = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    return task ? task.title : '未知任务';
  };

  // Count tasks per project
  const getProjectTaskCount = (projectId: string) => {
    return tasks.filter((t) => t.projectId === projectId).length;
  };

  // Priority labels
  const priorityLabels: Record<number, string> = {
    1: '低',
    2: '中',
    3: '高',
    4: '紧急',
  };

  const priorityColors: Record<number, string> = {
    1: 'text-gray-500',
    2: 'text-blue-500',
    3: 'text-orange-500',
    4: 'text-red-500',
  };

  // Export data
  const exportData = () => {
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

  // Import data
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Validate structure
        if (!data.tasks || !data.projects) {
          setImportMessage('❌ 无效的备份文件格式');
          return;
        }

        // Merge with existing data
        const store = useStore.getState();
        
        // Merge tasks - add only new tasks (by id)
        const existingTaskIds = new Set(store.tasks.map((t) => t.id));
        const newTasks = data.tasks.filter((t: Task) => !existingTaskIds.has(t.id));
        
        // Merge projects
        const existingProjectIds = new Set(store.projects.map((p) => p.id));
        const newProjects = data.projects.filter((p: Project) => !existingProjectIds.has(p.id));
        
        // Apply updates
        const allTasks = [...store.tasks, ...newTasks];
        const allProjects = [...store.projects, ...newProjects];
        
        useStore.setState({
          tasks: allTasks,
          projects: allProjects,
          sections: data.sections ? [...store.sections, ...data.sections.filter((s: any) => !store.sections.find((existing) => existing.id === s.id))] : store.sections,
          labels: data.labels ? [...store.labels, ...data.labels.filter((l: any) => !store.labels.find((existing) => existing.id === l.id))] : store.labels,
          comments: data.comments ? [...store.comments, ...data.comments.filter((c: any) => !store.comments.find((existing) => existing.id === c.id))] : store.comments,
          pomodoroSessions: data.pomodoroSessions ? [...store.pomodoroSessions, ...data.pomodoroSessions.filter((s: any) => !store.pomodoroSessions.find((existing) => existing.id === s.id))] : store.pomodoroSessions,
        });

        setImportMessage(`✅ 成功导入 ${newTasks.length} 个新任务, ${newProjects.length} 个新项目`);
        setTimeout(() => setImportMessage(null), 3000);
      } catch {
        setImportMessage('❌ 导入失败，请检查文件格式');
        setTimeout(() => setImportMessage(null), 3000);
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  // Clear all data
  const clearAllData = () => {
    useStore.setState({
      tasks: [],
      projects: [],
      sections: [],
      labels: [],
      comments: [],
      pomodoroSessions: [],
    });
    setShowClearConfirm(false);
  };

  // Format time
  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Mode labels
  const modeLabels: Record<string, string> = {
    focus: '专注',
    shortBreak: '短休息',
    longBreak: '长休息',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">管理后台</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">查看和管理所有数据</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={16} />
            导出 JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Upload size={16} />
            导入数据
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={importData}
            className="hidden"
          />
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 size={16} />
            清除数据
          </button>
        </div>
      </div>

      {/* Import Message */}
      {importMessage && (
        <div className="px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm font-medium">
          {importMessage}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <span className="text-lg">📋</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">任务数</p>
              <p className="text-2xl font-black text-blue-500">{stats.totalTasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <span className="text-lg">📁</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">项目数</p>
              <p className="text-2xl font-black text-purple-500">{stats.totalProjects}</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <span className="text-lg">🏷️</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">标签数</p>
              <p className="text-2xl font-black text-emerald-500">{stats.totalLabels}</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <span className="text-lg">🍅</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">番茄数</p>
              <p className="text-2xl font-black text-red-500">{stats.totalPomodoros}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>📋</span> 任务列表
              <span className="text-xs font-normal text-[var(--text-tertiary)]">({filteredTasks.length})</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="搜索任务..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-[var(--bg-active)] border border-[var(--border-color)] rounded-lg text-sm w-48 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
              <select
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-[var(--bg-active)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none"
              >
                <option value="all">全部</option>
                <option value="pending">待完成</option>
                <option value="completed">已完成</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-active)] text-[var(--text-tertiary)] text-xs font-bold uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left w-16">ID</th>
                <th className="px-4 py-2.5 text-left">标题</th>
                <th className="px-4 py-2.5 text-left">项目</th>
                <th className="px-4 py-2.5 text-left w-16">优先级</th>
                <th className="px-4 py-2.5 text-left w-16">状态</th>
                <th className="px-4 py-2.5 text-center w-20">番茄</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-4 py-3 text-[var(--text-tertiary)] font-mono text-xs">
                    {task.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[var(--text-primary)] font-medium">{task.title}</span>
                    {task.description && (
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate max-w-xs">
                        {task.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getProjectColor(task.projectId) }}
                      />
                      <span className="text-[var(--text-secondary)] text-xs">
                        {getProjectName(task.projectId)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${priorityColors[task.priority]}`}>
                      {priorityLabels[task.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {task.isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                        <CheckCircle size={12} />
                        已完成
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500">
                        <Circle size={12} />
                        待完成
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">
                      {task.completedPomodoros}/{task.plannedPomodoros}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTasks.length === 0 && (
            <div className="px-4 py-8 text-center text-[var(--text-tertiary)] text-sm">
              暂无任务数据
            </div>
          )}
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>📁</span> 项目列表
            <span className="text-xs font-normal text-[var(--text-tertiary)]">({projects.length})</span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-active)] text-[var(--text-tertiary)] text-xs font-bold uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left w-16">ID</th>
                <th className="px-4 py-2.5 text-left">名称</th>
                <th className="px-4 py-2.5 text-left w-24">颜色</th>
                <th className="px-4 py-2.5 text-center w-20">任务数</th>
                <th className="px-4 py-2.5 text-center w-24">番茄开关</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-4 py-3 text-[var(--text-tertiary)] font-mono text-xs">
                    {project.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="text-[var(--text-primary)] font-medium">{project.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded border border-[var(--border-color)]"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="text-xs text-[var(--text-tertiary)]">{project.color}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[var(--text-secondary)] font-semibold">
                      {getProjectTaskCount(project.id)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      project.usePomodoro ? 'bg-red-500/10 text-red-500' : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {project.usePomodoro ? '✅ 已启用' : '❌ 未启用'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {projects.length === 0 && (
            <div className="px-4 py-8 text-center text-[var(--text-tertiary)] text-sm">
              暂无项目数据
            </div>
          )}
        </div>
      </div>

      {/* Pomodoro Sessions Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>🍅</span> 番茄钟记录
            <span className="text-xs font-normal text-[var(--text-tertiary)]">({pomodoroSessions.length})</span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-active)] text-[var(--text-tertiary)] text-xs font-bold uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left">任务</th>
                <th className="px-4 py-2.5 text-left">开始时间</th>
                <th className="px-4 py-2.5 text-left">结束时间</th>
                <th className="px-4 py-2.5 text-center w-20">时长</th>
                <th className="px-4 py-2.5 text-left">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {pomodoroSessions.map((session) => (
                <tr key={session.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-[var(--text-primary)] font-medium">
                      {getTaskTitle(session.taskId)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                    {formatTime(session.startedAt)}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                    {formatTime(session.endedAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[var(--text-secondary)] font-semibold">
                      {session.durationMinutes.toFixed(1)}m
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        session.completed 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {session.completed ? '✅ 已完成' : '⏸️ 中断'}
                      </span>
                      <span className="text-[var(--text-tertiary)] text-xs">
                        {modeLabels[session.mode] || session.mode}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pomodoroSessions.length === 0 && (
            <div className="px-4 py-8 text-center text-[var(--text-tertiary)] text-sm">
              暂无番茄钟记录
            </div>
          )}
        </div>
      </div>

      {/* Clear Data Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-96 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">清除所有数据</h3>
                <p className="text-sm text-[var(--text-tertiary)]">此操作不可撤销</p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              确定要清除所有数据吗？包括任务、项目、标签、评论和番茄钟记录。
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={clearAllData}
                className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                确认清除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
