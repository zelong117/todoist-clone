import { useState, useMemo, useCallback } from 'react';
import {
  Filter,
  AlertTriangle,
  CalendarDays,
  Clock,
  FolderOpen,
  X,
  Search,
} from 'lucide-react';
import { useStore } from '../store';
import type { Task } from '../types';

interface FilterPanelProps {
  onFilterChange: (filter: ((task: Task) => boolean) | null, label: string) => void;
  activeFilterLabel?: string;
}

interface PresetFilter {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  filter: (task: Task) => boolean;
}

export default function FilterPanel({ onFilterChange, activeFilterLabel }: FilterPanelProps) {
  const { tasks } = useStore();
  const [customQuery, setCustomQuery] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const presetFilters: PresetFilter[] = useMemo(
    () => [
      {
        id: 'high-priority',
        label: '高优先级',
        icon: <AlertTriangle size={14} />,
        color: '#DC4C3E',
        bgColor: '#FEF2F2',
        filter: (t) => !t.isCompleted && t.priority <= 2,
      },
      {
        id: 'due-today',
        label: '今天到期',
        icon: <CalendarDays size={14} />,
        color: '#10B981',
        bgColor: '#ECFDF5',
        filter: (t) => !t.isCompleted && t.dueDate === today,
      },
      {
        id: 'overdue',
        label: '已过期',
        icon: <Clock size={14} />,
        color: '#F59E0B',
        bgColor: '#FFFBEB',
        filter: (t) => !t.isCompleted && !!t.dueDate && t.dueDate < today,
      },
      {
        id: 'no-project',
        label: '无项目',
        icon: <FolderOpen size={14} />,
        color: '#6B7280',
        bgColor: '#F3F4F6',
        filter: (t) => !t.isCompleted && t.projectId === null,
      },
    ],
    [today]
  );

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    presetFilters.forEach((f) => {
      counts[f.id] = tasks.filter(f.filter).length;
    });
    return counts;
  }, [tasks, presetFilters]);

  const handlePresetClick = useCallback(
    (filter: PresetFilter) => {
      if (activePreset === filter.id) {
        setActivePreset(null);
        onFilterChange(null, '');
      } else {
        setActivePreset(filter.id);
        onFilterChange(filter.filter, filter.label);
      }
    },
    [activePreset, onFilterChange]
  );

  const handleCustomFilter = useCallback(() => {
    if (!customQuery.trim()) {
      onFilterChange(null, '');
      return;
    }
    const query = customQuery.trim().toLowerCase();
    onFilterChange(
      (t) => t.title.toLowerCase().includes(query),
      `搜索: ${customQuery.trim()}`
    );
  }, [customQuery, onFilterChange]);

  const handleClear = useCallback(() => {
    setActivePreset(null);
    setCustomQuery('');
    onFilterChange(null, '');
  }, [onFilterChange]);

  const hasActiveFilter = activePreset || customQuery.trim();

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-light)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[var(--text-tertiary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">过滤器</h3>
        </div>
        {hasActiveFilter && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <X size={12} />
            清除
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {presetFilters.map((filter) => {
          const isActive = activePreset === filter.id;
          const count = filterCounts[filter.id] || 0;
          return (
            <button
              key={filter.id}
              onClick={() => handlePresetClick(filter)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                isActive ? 'ring-2 ring-offset-1' : 'hover:shadow-sm'
              }`}
              style={{
                backgroundColor: isActive ? filter.bgColor : '#F9FAFB',
              }}
            >
              <span style={{ color: filter.color }}>{filter.icon}</span>
              <span className="text-[var(--text-secondary)] text-xs font-medium">{filter.label}</span>
              <span className="ml-auto text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <label className="text-xs font-medium text-[var(--text-tertiary)] mb-1.5 block">自定义搜索</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomFilter();
                if (e.key === 'Escape') handleClear();
              }}
              placeholder="按标题搜索..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-[var(--border-color)] rounded-lg outline-none focus:border-[#DC4C3E]/40 transition-colors"
            />
          </div>
          <button
            onClick={handleCustomFilter}
            disabled={!customQuery.trim()}
            className="px-3 py-1.5 text-sm bg-[var(--bg-active)] hover:bg-[var(--bg-active)] text-[var(--text-secondary)] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            筛选
          </button>
        </div>
      </div>

      {hasActiveFilter && activeFilterLabel && (
        <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-[#DC4C3E]/5 rounded-lg">
          <span className="text-xs text-[#DC4C3E]">当前过滤: {activeFilterLabel}</span>
        </div>
      )}
    </div>
  );
}
