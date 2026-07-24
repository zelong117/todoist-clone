import { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../store';
import type { Task, Project } from '../types';
import { Search, Download, Upload, Trash2, CheckCircle, Circle, Users, Settings } from 'lucide-react';

interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  balance: number;
  plan_expires_at: string | null;
  created_at: string;
}

export default function Admin() {
  const { tasks, projects, labels, pomodoroSessions } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [taskSearch, setTaskSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [users, setUsers] = useState<UserAccount[]>([]);


  const API_URL = `${window.location.protocol}//${window.location.hostname}:3001/api`;

  // Stats
  const stats = useMemo(() => ({
    totalTasks: tasks.length,
    totalProjects: projects.length,
    totalLabels: labels.length,
    totalPomodoros: pomodoroSessions.length,
  }), [tasks, projects, labels, pomodoroSessions]);

  // 服务端商业数据
  const [serverStats, setServerStats] = useState<any>(null);

  // 获取用户列表
  useEffect(() => {
    const fetchUsers = async () => {
  
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (e) {
        console.error('Failed to fetch users:', e);
      }
  
    };
    fetchUsers();

    // 获取服务端统计
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setServerStats(data);
        }
      } catch (e) { /* ignore */ }
    };
    fetchStats();


  }, []);

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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">\u7ba1\u7406\u540e\u53f0</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">\u6570\u636e\u7edf\u8ba1 \u00b7 \u7528\u6237\u7ba1\u7406 \u00b7 \u7cfb\u7edf\u914d\u7f6e</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportData} className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md">
            <Download size={16} />
            \u5bfc\u51fa
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md">
            <Upload size={16} />
            \u5bfc\u5165
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={importData} className="hidden" />
          <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-all border border-red-500/20">
            <Trash2 size={16} />
            \u6e05\u9664
          </button>
        </div>
      </div>

      {/* Import/Export Messages */}
      {importMessage && (
        <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm font-medium text-emerald-600 flex items-center gap-2">
          <CheckCircle size={16} />
          {importMessage}
        </div>
      )}

      {/* ===== Stats Cards ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '\u4efb\u52a1\u603b\u6570', value: stats.totalTasks, icon: '\ud83d\udccb', color: 'blue', sub: `\u5f85\u5b8c\u6210 ${stats.totalTasks - tasks.filter(t => t.isCompleted).length}` },
          { label: '\u9879\u76ee\u603b\u6570', value: stats.totalProjects, icon: '\ud83d\udcc1', color: 'purple', sub: `\u653f\u5f85 ${stats.totalProjects}` },
          { label: '\u6807\u7b7e\u603b\u6570', value: stats.totalLabels, icon: '\ud83c\udff7\ufe0f', color: 'green', sub: '\u5df2\u521b\u5efa' },
          { label: '\u756a\u8304\u949f', value: stats.totalPomodoros, icon: '\ud83c\udf45', color: 'red', sub: '\u5df2\u5b8c\u6210' },
        ].map((s, i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-lg bg-${s.color}-500/10 text-${s.color}-500`}>{s.sub}</span>
            </div>
            <p className="text-3xl font-black text-[var(--text-primary)]">{s.value}</p>
            <p className="text-xs font-medium text-[var(--text-tertiary)] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ===== Task Completion Overview ===== */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
        <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">\u4efb\u52a1\u5b8c\u6210\u7387</h2>
        <div className="space-y-3">
          {[
            { label: '\u603b\u4f53\u5b8c\u6210\u7387', done: tasks.filter(t => t.isCompleted).length, total: tasks.length || 1, color: '#DC4C3E' },
            ...projects.slice(0, 5).map(p => ({
              label: p.name,
              done: tasks.filter(t => t.projectId === p.id && t.isCompleted).length,
              total: Math.max(tasks.filter(t => t.projectId === p.id).length, 1),
              color: p.color,
            })),
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="text-sm text-[var(--text-secondary)] w-24 truncate">{item.label}</span>
              <div className="flex-1 h-3 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round(item.done / item.total * 100)}%`, backgroundColor: item.color }} />
              </div>
              <span className="text-xs font-bold text-[var(--text-tertiary)] w-16 text-right">{item.done}/{item.total - (item.total === 1 && item.done === 0 ? 0 : 0)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Users Table ===== */}
      {serverStats && users.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-color)]">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Users size={18} />
              \u7528\u6237\u5217\u8868
              <span className="text-xs font-normal text-[var(--text-tertiary)] bg-[var(--bg-hover)] px-2 py-0.5 rounded-full">{users.length}</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-hover)] text-[var(--text-tertiary)] text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-3 text-left">\u7528\u6237</th>
                  <th className="px-6 py-3 text-left">\u90ae\u7bb1</th>
                  <th className="px-6 py-3 text-center">\u89d2\u8272</th>
                  <th className="px-6 py-3 text-center">\u5957\u9910</th>
                  <th className="px-6 py-3 text-center">\u6ce8\u518c\u65f6\u95f4</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#B83A2E] flex items-center justify-center text-white text-sm font-bold">{(u.name || u.email)[0].toUpperCase()}</div>
                        <span className="font-medium text-[var(--text-primary)]">{u.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-[var(--text-secondary)]">{u.email}</td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-600' : 'bg-[var(--bg-active)] text-[var(--text-secondary)]'}`}>
                        {u.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${u.plan === 'pro' ? 'bg-emerald-500/10 text-emerald-600' : u.plan === 'business' ? 'bg-blue-500/10 text-blue-600' : 'bg-[var(--bg-active)] text-[var(--text-tertiary)]'}`}>
                        {u.plan === 'pro' ? 'Pro' : u.plan === 'business' ? 'Business' : 'Free'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center text-xs text-[var(--text-tertiary)]">{formatTime(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== Tasks Table ===== */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Settings size={18} />
              \u4efb\u52a1\u7ba1\u7406
              <span className="text-xs font-normal text-[var(--text-tertiary)] bg-[var(--bg-hover)] px-2 py-0.5 rounded-full">{filteredTasks.length}</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input type="text" placeholder="\u641c\u7d22\u4efb\u52a1..." value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} className="pl-9 pr-3 py-1.5 bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl text-sm w-48 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all" />
              </div>
              <select value={taskFilter} onChange={(e) => setTaskFilter(e.target.value as any)} className="px-3 py-1.5 bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none">
                <option value="all">\u5168\u90e8</option>
                <option value="pending">\u5f85\u5b8c\u6210</option>
                <option value="completed">\u5df2\u5b8c\u6210</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-hover)] text-[var(--text-tertiary)] text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-3 text-left">\u6807\u9898</th>
                <th className="px-6 py-3 text-left">\u9879\u76ee</th>
                <th className="px-6 py-3 text-center w-24">\u4f18\u5148\u7ea7</th>
                <th className="px-6 py-3 text-center w-28">\u72b6\u6001</th>
                <th className="px-6 py-3 text-center w-20">\u756a\u8304\u949f</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-6 py-3.5">
                    <span className="text-[var(--text-primary)] font-medium">{task.title}</span>
                    {task.description && <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate max-w-xs">{task.description}</p>}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getProjectColor(task.projectId) }} />
                      <span className="text-[var(--text-secondary)] text-xs">{getProjectName(task.projectId)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={`text-xs font-bold ${priorityColors[task.priority]}`}>{priorityLabels[task.priority]}</span>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {task.isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600"><CheckCircle size={12} />\u5df2\u5b8c\u6210</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-500/10 text-orange-600"><Circle size={12} />\u5f85\u5b8c\u6210</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">{task.completedPomodoros}/{task.plannedPomodoros}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Clear Confirm Dialog ===== */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-color)] w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">\u786e\u8ba4\u6e05\u9664\u6240\u6709\u6570\u636e\uff1f</h3>
            <p className="text-sm text-[var(--text-tertiary)] mb-6">\u6b64\u64cd\u4f5c\u4e0d\u53ef\u64a4\u9500\uff0c\u6240\u6709\u4efb\u52a1\u3001\u9879\u76ee\u548c\u6807\u7b7e\u5c06\u88ab\u6c38\u4e45\u5220\u9664\u3002</p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-xl transition-colors">\u53d6\u6d88</button>
              <button onClick={clearAllData} className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-sm">\u786e\u8ba4\u6e05\u9664</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

