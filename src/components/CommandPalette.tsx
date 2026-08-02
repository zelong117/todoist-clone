import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CalendarDays, CheckSquare2, Command, Inbox, Plus, Search, Settings, Sparkles } from 'lucide-react';
import type { Task } from '../types';

interface CommandPaletteProps {
  tasks: Task[];
  onClose: () => void;
  onOpenTask: (taskId: string) => void;
  onQuickAdd: () => void;
  onNavigate: (view: string) => void;
}

type CommandItem = { id: string; label: string; hint?: string; icon: typeof Inbox; run: () => void };

export default function CommandPalette({ tasks, onClose, onOpenTask, onQuickAdd, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const commands = useMemo<CommandItem[]>(() => [
    { id: 'new-task', label: '新建任务', hint: 'N', icon: Plus, run: () => { onClose(); onQuickAdd(); } },
    { id: 'inbox', label: '打开收件箱', hint: 'G I', icon: Inbox, run: () => { onClose(); onNavigate('inbox'); } },
    { id: 'today', label: '查看今天', hint: 'G T', icon: CalendarDays, run: () => { onClose(); onNavigate('today'); } },
    { id: 'notifications', label: '打开通知中心', icon: Bell, run: () => { onClose(); onNavigate('notifications'); } },
    { id: 'settings', label: '打开设置', icon: Settings, run: () => { onClose(); onNavigate('settings'); } },
  ], [onClose, onNavigate, onQuickAdd]);

  const normalized = query.trim().toLowerCase();
  const filteredCommands = normalized ? commands.filter((item) => item.label.toLowerCase().includes(normalized)) : commands;
  const matchingTasks = normalized ? tasks.filter((task) => `${task.title} ${task.description}`.toLowerCase().includes(normalized)).slice(0, 7) : [];
  const entries = [
    ...filteredCommands.map((item) => ({ kind: 'command' as const, id: item.id, label: item.label, hint: item.hint, icon: item.icon, run: item.run })),
    ...matchingTasks.map((task) => ({ kind: 'task' as const, id: task.id, label: task.title, hint: task.projectId ? '项目任务' : '收件箱', icon: CheckSquare2, run: () => { onClose(); onOpenTask(task.id); } })),
  ];

  useEffect(() => { setActiveIndex(0); }, [query]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, Math.max(0, entries.length - 1))); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
    if (event.key === 'Enter' && entries[activeIndex]) { event.preventDefault(); entries[activeIndex].run(); }
  };

  return <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/45 px-4 pt-[12vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="命令面板" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="w-full max-w-xl overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl">
      <div className="flex items-center gap-3 border-b border-[var(--border-color)] px-4 py-3"><Search size={18} className="text-[var(--text-tertiary)]" /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onKeyDown} placeholder="搜索任务或输入命令..." className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" /><kbd className="rounded border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)]">Esc</kbd></div>
      <div className="max-h-[55vh] overflow-y-auto p-2">{entries.length === 0 ? <div className="grid place-items-center gap-2 px-5 py-12 text-center"><Sparkles size={20} className="text-[var(--accent)]" /><p className="text-sm font-medium text-[var(--text-primary)]">没有匹配结果</p><p className="text-xs text-[var(--text-tertiary)]">尝试任务标题、描述或常用命令。</p></div> : <>{filteredCommands.length > 0 && <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--text-tertiary)]">命令</p>}{entries.map((entry, index) => { const Icon = entry.icon; const taskStart = filteredCommands.length; const showTaskLabel = entry.kind === 'task' && index === taskStart; return <div key={`${entry.kind}-${entry.id}`}><>{showTaskLabel && <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--text-tertiary)]">任务</p>}</><button type="button" onMouseEnter={() => setActiveIndex(index)} onClick={entry.run} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${index === activeIndex ? 'bg-[var(--bg-active)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}><span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--bg-primary)] text-[var(--accent)]"><Icon size={15} /></span><span className="min-w-0 flex-1 truncate text-sm font-medium">{entry.label}</span>{entry.hint && <kbd className="rounded border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)]">{entry.hint}</kbd>}</button></div>; })}</>}</div>
      <footer className="flex items-center justify-between border-t border-[var(--border-color)] px-4 py-2 text-[10px] text-[var(--text-tertiary)]"><span className="inline-flex items-center gap-1"><Command size={12} /> 命令面板</span><span>↑↓ 选择 · Enter 执行</span></footer>
    </section>
  </div>;
}
