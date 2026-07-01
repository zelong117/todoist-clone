import { useMemo, useCallback, useState } from 'react';
import { AlertTriangle, CalendarDays, Clock, FolderOpen, Tag, X, Search } from 'lucide-react';
import { useStore } from '../store';
import type { Task } from '../types';

interface FilterPageProps {
  onFilterChange: (fn: ((task: Task) => boolean) | null, label: string) => void;
  activeFilterLabel: string;
}

interface PresetFilter {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  filter: (task: Task) => boolean;
}

export default function FilterPage({ onFilterChange, activeFilterLabel }: FilterPageProps) {
  const { tasks, labels } = useStore();
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [activeLabelFilter, setActiveLabelFilter] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState('');

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const presetFilters: PresetFilter[] = useMemo(
    () => [
      {
        id: 'high-priority',
        label: '高优先级',
        icon: <AlertTriangle size={16} />,
        color: '#DC4C3E',
        bgColor: '#FEF2F2',
        filter: (t) => !t.isCompleted && t.priority <= 2,
      },
      {
        id: 'due-today',
        label: '今天到期',
        icon: <CalendarDays size={16} />,
        color: '#10B981',
        bgColor: '#ECFDF5',
        filter: (t) => !t.isCompleted && t.dueDate === today,
      },
      {
        id: 'overdue',
        label: '已过期',
        icon: <Clock size={16} />,
        color: '#F59E0B',
        bgColor: '#FFFBEB',
        filter: (t) => !t.isCompleted && !!t.dueDate && t.dueDate < today,
      },
      {
        id: 'no-project',
        label: '无项目',
        icon: <FolderOpen size={16} />,
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

  const labelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    labels.forEach((l) => {
      counts[l.name] = tasks.filter(
        (t) => !t.isCompleted && t.labels.includes(l.name)
      ).length;
    });
    return counts;
  }, [tasks, labels]);

  const handlePresetClick = useCallback(
    (filter: PresetFilter) => {
      if (activePreset === filter.id) {
        setActivePreset(null);
        setActiveLabelFilter(null);
        setCustomQuery('');
        onFilterChange(null, '');
      } else {
        setActivePreset(filter.id);
        setActiveLabelFilter(null);
        setCustomQuery('');
        onFilterChange(filter.filter, filter.label);
      }
    },
    [activePreset, onFilterChange]
  );

  const handleLabelClick = useCallback(
    (labelName: string) => {
      if (activeLabelFilter === labelName) {
        setActiveLabelFilter(null);
        setActivePreset(null);
        setCustomQuery('');
        onFilterChange(null, '');
      } else {
        setActiveLabelFilter(labelName);
        setActivePreset(null);
        setCustomQuery('');
        onFilterChange(
          (t: Task) => !t.isCompleted && t.labels.includes(labelName),
          `标签: ${labelName}`
        );
      }
    },
    [activeLabelFilter, onFilterChange]
  );

  const handleCustomFilter = useCallback(() => {
    if (!customQuery.trim()) {
      onFilterChange(null, '');
      return;
    }
    const query = customQuery.trim().toLowerCase();
    setActivePreset(null);
    setActiveLabelFilter(null);
    onFilterChange(
      (t: Task) => !t.isCompleted && t.title.toLowerCase().includes(query),
      `搜索: ${customQuery.trim()}`
    );
  }, [customQuery, onFilterChange]);

  const handleClear = useCallback(() => {
    setActivePreset(null);
    setActiveLabelFilter(null);
    setCustomQuery('');
    onFilterChange(null, '');
  }, [onFilterChange]);

  const hasActiveFilter = activePreset || activeLabelFilter || customQuery.trim();

  return (
    <div>
      {/* Active filter indicator */}
      {hasActiveFilter && activeFilterLabel && (
        <div className="flex items-center gap-2 mb-6 px-4 py-2.5 bg-[#DC4C3E]/5 rounded-xl">
          <span className="text-sm text-[#DC4C3E] font-medium">当前过滤: {activeFilterLabel}</span>
          <button
            onClick={handleClear}
            className="text-[#DC4C3E] hover:text-[#b33a2d] transition-colors ml-auto"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Preset Filters */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            我的过滤器
          </h3>
          <div className="space-y-2">
            {presetFilters.map((filter) => {
              const isActive = activePreset === filter.id;
              const count = filterCounts[filter.id] || 0;
              return (
                <button
                  key={filter.id}
                  onClick={() => handlePresetClick(filter)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm transition-all ${
                    isActive
                      ? 'ring-2 ring-offset-1 shadow-sm'
                      : 'hover:shadow-sm hover:bg-gray-50'
                  }`}
                  style={{
                    backgroundColor: isActive ? filter.bgColor : '#FAFAFA',
                  }}
                >
                  <span style={{ color: filter.color }}>{filter.icon}</span>
                  <span className="text-gray-700 font-medium">{filter.label}</span>
                  <span className="ml-auto text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Labels */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            标签
          </h3>
          {labels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Tag size={32} className="mb-2 opacity-30" />
              <p className="text-sm">暂无标签</p>
            </div>
          ) : (
            <div className="space-y-2">
              {labels.map((label) => {
                const isActive = activeLabelFilter === label.name;
                const count = labelCounts[label.name] || 0;
                return (
                  <button
                    key={label.id}
                    onClick={() => handleLabelClick(label.name)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm transition-all ${
                      isActive
                        ? 'ring-2 ring-offset-1 shadow-sm'
                        : 'hover:shadow-sm hover:bg-gray-50'
                    }`}
                    style={{
                      backgroundColor: isActive ? `${label.color}15` : '#FAFAFA',
                    }}
                  >
                    <Tag size={16} style={{ color: label.color }} />
                    <span className="text-gray-700 font-medium">{label.name}</span>
                    <span className="ml-auto text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Custom Search */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          自定义搜索
        </h3>
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomFilter();
                if (e.key === 'Escape') handleClear();
              }}
              placeholder="按标题搜索..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#DC4C3E]/40 focus:ring-2 focus:ring-[#DC4C3E]/10 transition-all"
            />
          </div>
          <button
            onClick={handleCustomFilter}
            disabled={!customQuery.trim()}
            className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
          >
            筛选
          </button>
        </div>
      </div>
    </div>
  );
}
