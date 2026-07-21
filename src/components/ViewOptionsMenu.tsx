import { ArrowDownAZ, CalendarDays, Columns3, List, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { ViewMode } from '../types';

export interface ViewOptions {
  groupBy: 'section' | 'none';
  sortBy: 'manual' | 'dueDate' | 'priority' | 'title';
  direction: 'asc' | 'desc';
  priority: 'all' | '1' | '2' | '3' | '4';
  label: string;
  showCompleted: boolean;
}

interface Props {
  viewMode: ViewMode;
  options: ViewOptions;
  labels: string[];
  onViewModeChange: (mode: ViewMode) => void;
  onOptionsChange: (options: ViewOptions) => void;
}

export const DEFAULT_VIEW_OPTIONS: ViewOptions = {
  groupBy: 'section', sortBy: 'manual', direction: 'asc', priority: 'all', label: '', showCompleted: false,
};

export default function ViewOptionsMenu({ viewMode, options, labels, onViewModeChange, onOptionsChange }: Props) {
  const update = <K extends keyof ViewOptions>(key: K, value: ViewOptions[K]) => onOptionsChange({ ...options, [key]: value });
  const modes: { id: ViewMode; label: string; icon: typeof List }[] = [
    { id: 'list', label: '列表', icon: List }, { id: 'board', label: '看板', icon: Columns3 }, { id: 'calendar', label: '日历', icon: CalendarDays },
  ];

  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
        <SlidersHorizontal size={16} /><span>视图</span>
      </summary>
      <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3 shadow-xl">
        <div className="grid grid-cols-3 gap-1 rounded-md bg-[var(--bg-active)] p-1">
          {modes.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => onViewModeChange(id)} className={`flex items-center justify-center gap-1 rounded px-2 py-1.5 text-xs ${viewMode === id ? 'bg-[var(--bg-card)] font-semibold text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-tertiary)]'}`}><Icon size={14}/>{label}</button>)}
        </div>
        <div className="mt-3 grid grid-cols-[76px_1fr] items-center gap-x-3 gap-y-2 text-sm">
          <label className="text-[var(--text-tertiary)]">分组</label><select value={options.groupBy} onChange={(e) => update('groupBy', e.target.value as ViewOptions['groupBy'])} className="rounded border border-[var(--border-color)] bg-transparent px-2 py-1.5"><option value="section">按版块</option><option value="none">不分组</option></select>
          <label className="text-[var(--text-tertiary)]">排序</label><select value={options.sortBy} onChange={(e) => update('sortBy', e.target.value as ViewOptions['sortBy'])} className="rounded border border-[var(--border-color)] bg-transparent px-2 py-1.5"><option value="manual">手动顺序</option><option value="dueDate">日期</option><option value="priority">优先级</option><option value="title">标题</option></select>
          <label className="text-[var(--text-tertiary)]">方向</label><button onClick={() => update('direction', options.direction === 'asc' ? 'desc' : 'asc')} className="flex items-center gap-2 rounded border border-[var(--border-color)] px-2 py-1.5"><ArrowDownAZ size={14}/>{options.direction === 'asc' ? '升序' : '降序'}</button>
          <label className="text-[var(--text-tertiary)]">优先级</label><select value={options.priority} onChange={(e) => update('priority', e.target.value as ViewOptions['priority'])} className="rounded border border-[var(--border-color)] bg-transparent px-2 py-1.5"><option value="all">全部</option><option value="1">P1</option><option value="2">P2</option><option value="3">P3</option><option value="4">P4</option></select>
          <label className="text-[var(--text-tertiary)]">标签</label><select value={options.label} onChange={(e) => update('label', e.target.value)} className="rounded border border-[var(--border-color)] bg-transparent px-2 py-1.5"><option value="">全部</option>{labels.map((label) => <option key={label} value={label}>{label}</option>)}</select>
        </div>
        <label className="mt-3 flex items-center justify-between border-t border-[var(--border-color)] pt-3 text-sm"><span>显示已完成任务</span><input type="checkbox" checked={options.showCompleted} onChange={(e) => update('showCompleted', e.target.checked)} /></label>
        <button onClick={() => onOptionsChange(DEFAULT_VIEW_OPTIONS)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"><RotateCcw size={13}/>重置视图</button>
      </div>
    </details>
  );
}
