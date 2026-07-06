import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { AlertTriangle, CalendarDays, Clock, FolderOpen, Tag, X, Search, Plus, Check, Trash2, Edit3, CheckCircle2 } from 'lucide-react';
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

const LABEL_COLORS = ['#DC4C3E', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

export default function FilterPage({ onFilterChange, activeFilterLabel }: FilterPageProps) {
  const { tasks, labels, addLabel, deleteLabel } = useStore();
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [activeLabelFilter, setActiveLabelFilter] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState('');
  const [showNewLabel, setShowNewLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#10B981');
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editLabelName, setEditLabelName] = useState('');
  const labelInputRef = useRef<HTMLInputElement>(null);

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
      (t: Task) => !t.isCompleted && (t.title.toLowerCase().includes(query) || t.description.toLowerCase().includes(query)),
      `搜索: ${customQuery.trim()}`
    );
  }, [customQuery, onFilterChange]);

  const handleClear = useCallback(() => {
    setActivePreset(null);
    setActiveLabelFilter(null);
    setCustomQuery('');
    onFilterChange(null, '');
  }, [onFilterChange]);

  const handleAddLabel = useCallback(() => {
    if (!newLabelName.trim()) return;
    addLabel({ name: newLabelName.trim(), color: newLabelColor });
    setNewLabelName('');
    setNewLabelColor('#10B981');
    setShowNewLabel(false);
  }, [newLabelName, newLabelColor, addLabel]);

  const handleDeleteLabel = useCallback((labelId: string, labelName: string) => {
    if (activeLabelFilter === labelName) {
      setActiveLabelFilter(null);
      onFilterChange(null, '');
    }
    deleteLabel(labelId);
  }, [activeLabelFilter, onFilterChange, deleteLabel]);

  const handleStartEditLabel = useCallback((labelId: string, currentName: string) => {
    setEditingLabelId(labelId);
    setEditLabelName(currentName);
  }, []);

  const hasActiveFilter = activePreset || activeLabelFilter || customQuery.trim();

  useEffect(() => {
    if (showNewLabel && labelInputRef.current) {
      labelInputRef.current.focus();
    }
  }, [showNewLabel]);

  return (
    <div className="animate-fade-in">
      {/* Active filter indicator */}
      {hasActiveFilter && activeFilterLabel && (
        <div className="flex items-center gap-2 mb-6 px-4 py-2.5 bg-[#DC4C3E]/5 rounded-xl border border-[#DC4C3E]/10">
          <span className="text-sm text-[#DC4C3E] font-medium flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            当前过滤: {activeFilterLabel}
          </span>
          <button
            onClick={handleClear}
            className="text-[#DC4C3E] hover:text-[#b33a2d] transition-colors ml-auto p-1 rounded-lg hover:bg-[#DC4C3E]/10"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Preset Filters */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-[var(--accent)]" />
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
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                    isActive
                      ? 'ring-2 ring-offset-1 shadow-md scale-[1.02]'
                      : 'hover:shadow-sm hover:bg-[var(--bg-hover)] hover:scale-[1.01]'
                  }`}
                  style={{
                    backgroundColor: isActive ? filter.bgColor : 'var(--bg-card)',
                    transformOrigin: 'left',
                  }}
                >
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: isActive ? `${filter.color}15` : 'var(--bg-active)' }}
                  >
                    <span style={{ color: filter.color }}>{filter.icon}</span>
                  </span>
                  <span className="text-[var(--text-secondary)] font-medium">{filter.label}</span>
                  <span className="ml-auto text-xs text-[var(--text-tertiary)] bg-[var(--bg-card)] px-2 py-0.5 rounded-full border border-[var(--border-color)] font-semibold">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Labels */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-purple-500" />
            标签
            <button
              onClick={() => setShowNewLabel(!showNewLabel)}
              className="ml-auto flex items-center gap-1 text-xs font-medium text-purple-500 hover:text-purple-600 bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-lg transition-all"
            >
              <Plus size={12} />
              新建标签
            </button>
          </h3>

          {/* Inline label creation */}
          {showNewLabel && (
            <div className="mb-3 p-3 rounded-xl border border-purple-200 bg-purple-50/50 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <input
                  ref={labelInputRef}
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddLabel();
                    if (e.key === 'Escape') setShowNewLabel(false);
                  }}
                  placeholder="标签名称..."
                  className="flex-1 px-3 py-1.5 text-sm border border-purple-200 rounded-lg outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200 bg-white"
                />
                <button
                  onClick={handleAddLabel}
                  disabled={!newLabelName.trim()}
                  className="px-3 py-1.5 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setShowNewLabel(false)}
                  className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-hover)]"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewLabelColor(c)}
                    className={`w-6 h-6 rounded-full transition-all ${
                      newLabelColor === c ? 'ring-2 ring-offset-1 ring-purple-400 scale-110' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {labels.length === 0 && !showNewLabel ? (
            <div className="flex flex-col items-center justify-center py-8 text-[var(--text-tertiary)]">
              <Tag size={32} className="mb-2 opacity-30" />
              <p className="text-sm">暂无标签</p>
              <p className="text-xs mt-1 opacity-60">点击上方「新建标签」开始</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {labels.map((label) => {
                const isActive = activeLabelFilter === label.name;
                const count = labelCounts[label.name] || 0;
                const isEditing = editingLabelId === label.id;
                return (
                  <div
                    key={label.id}
                    className={`group flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                      isActive
                        ? 'ring-2 ring-offset-1 shadow-sm'
                        : 'hover:shadow-sm hover:bg-[var(--bg-hover)]'
                    }`}
                    style={{
                      backgroundColor: isActive ? `${label.color}15` : 'transparent',
                    }}
                  >
                    <button
                      onClick={() => handleLabelClick(label.name)}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editLabelName}
                          onChange={(e) => setEditLabelName(e.target.value)}
                          onBlur={() => setEditingLabelId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editLabelName.trim()) {
                                useStore.getState().updateLabel(label.id, { name: editLabelName.trim() });
                              }
                              setEditingLabelId(null);
                            }
                            if (e.key === 'Escape') setEditingLabelId(null);
                          }}
                          className="flex-1 text-sm text-[var(--text-primary)] font-medium bg-transparent border-b-2 border-purple-400 outline-none px-1 py-0.5"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-[var(--text-secondary)] font-medium truncate">{label.name}</span>
                      )}
                      <span className="ml-auto text-xs text-[var(--text-tertiary)] bg-[var(--bg-card)] px-2 py-0.5 rounded-full border border-[var(--border-color)] font-semibold">
                        {count}
                      </span>
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditLabel(label.id, label.name);
                        }}
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-blue-500 hover:bg-blue-50 transition-all"
                        title="重命名"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLabel(label.id, label.name);
                        }}
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 transition-all"
                        title="删除标签"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Custom Search */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-blue-500" />
          自定义搜索
        </h3>
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomFilter();
                if (e.key === 'Escape') handleClear();
              }}
              placeholder="按标题或描述搜索..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[var(--border-color)] rounded-xl outline-none focus:border-[#DC4C3E]/40 focus:ring-2 focus:ring-[#DC4C3E]/10 transition-all"
            />
          </div>
          <button
            onClick={handleCustomFilter}
            disabled={!customQuery.trim()}
            className="px-5 py-2.5 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium shadow-sm"
          >
            筛选
          </button>
          {customQuery.trim() && (
            <button
              onClick={handleClear}
              className="px-3 py-2.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-hover)] transition-all"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
