import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Flag, Calendar, Folder, Tag, Check } from 'lucide-react';
import { useStore } from '../store';

const PRIORITY_COLORS: Record<number, string> = {
  1: '#DC4C3E',
  2: '#F59E0B',
  3: '#3B82F6',
  4: '#6B7280',
};

function parseNaturalDate(input: string): { date: string | null; cleaned: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let date: Date | null = null;
  let cleaned = input;

  if (input.includes('今天') || input.includes('今日')) {
    date = new Date(today);
    cleaned = input.replace(/今天|今日/g, '').trim();
  } else if (input.includes('明天') || input.includes('明日')) {
    date = new Date(today);
    date.setDate(date.getDate() + 1);
    cleaned = input.replace(/明天|明日/g, '').trim();
  } else if (input.includes('后天')) {
    date = new Date(today);
    date.setDate(date.getDate() + 2);
    cleaned = input.replace(/后天/g, '').trim();
  } else if (input.includes('下周')) {
    date = new Date(today);
    date.setDate(date.getDate() + 7);
    cleaned = input.replace(/下周/g, '').trim();
  } else if (input.includes('下月')) {
    date = new Date(today);
    date.setMonth(date.getMonth() + 1);
    cleaned = input.replace(/下月/g, '').trim();
  } else if (input.includes('周末')) {
    date = new Date(today);
    const dayOfWeek = date.getDay();
    const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
    date.setDate(date.getDate() + daysUntilSaturday);
    cleaned = input.replace(/周末/g, '').trim();
  }

  return {
    date: date ? date.toISOString().split('T')[0] : null,
    cleaned,
  };
}

function parseNaturalPriority(input: string): { priority: 1 | 2 | 3 | 4; cleaned: string } {
  let priority: 1 | 2 | 3 | 4 = 4;
  let cleaned = input;

  if (input.includes('!!!') || input.includes('紧急') || input.includes('重要')) {
    priority = 1;
    cleaned = cleaned.replace(/!!!|紧急|重要/g, '').trim();
  } else if (input.includes('!!') || input.includes('高')) {
    priority = 2;
    cleaned = cleaned.replace(/!!|高(?=\s|$)/g, '').trim();
  } else if (input.includes('!') || input.includes('中')) {
    priority = 3;
    cleaned = cleaned.replace(/!|中(?=\s|$)/g, '').trim();
  }

  return { priority, cleaned };
}

interface QuickAddProps {
  defaultProjectId?: string;
  defaultDate?: string;
  onClose?: () => void;
}

export default function QuickAdd({ defaultProjectId, defaultDate, onClose }: QuickAddProps) {
  const { addTask, projects, labels } = useStore();
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4);
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId || null);
  const [dueDate, setDueDate] = useState(defaultDate || '');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const projectPickerRef = useRef<HTMLDivElement>(null);
  const labelPickerRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  useEffect(() => {
    setInput('');
    setPriority(4);
    setProjectId(defaultProjectId || null);
    setDueDate(defaultDate || '');
    setSelectedLabels([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [defaultProjectId, defaultDate]);

  // Close on Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [handleClose]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (projectPickerRef.current && !projectPickerRef.current.contains(e.target as Node)) {
        setShowProjectPicker(false);
      }
      if (labelPickerRef.current && !labelPickerRef.current.contains(e.target as Node)) {
        setShowLabelPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const parsedResult = useMemo(() => {
    if (!input) return { title: '', date: null, priority: 4 as 1 | 2 | 3 | 4 };
    const { date, cleaned: afterDate } = parseNaturalDate(input);
    const { priority: p, cleaned: afterPriority } = parseNaturalPriority(afterDate);
    return { title: afterPriority, date, priority: p };
  }, [input]);

  const handleSubmit = useCallback(() => {
    const title = parsedResult.title || input;
    if (!title.trim()) return;

    addTask({
      title: title.trim(),
      description: '',
      projectId: projectId,
      sectionId: null,
      parentId: null,
      priority: parsedResult.priority !== 4 ? parsedResult.priority : priority,
      labels: selectedLabels,
      dueDate: parsedResult.date || dueDate || null,
      isRecurring: false,
      recurrenceRule: null,
      isCompleted: false,
      pomodoroCount: 0,
      plannedPomodoros: 1,
      completedPomodoros: 0,
      estimatedMinutes: 25,
      completedAt: null,
      order: 0,
    });

    handleClose();
  }, [parsedResult, input, projectId, priority, dueDate, selectedLabels, addTask, handleClose]);

  const toggleLabel = (label: string) => {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)', backdropFilter: 'blur(6px)' }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg mx-4 bg-[var(--bg-card)] rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: 'slideUp 0.2s ease-out' }}
      >
        {/* Main input */}
        <div className="px-5 pt-5 pb-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="输入任务标题..."
            className="w-full text-lg text-gray-900 outline-none placeholder-gray-300 font-medium"
          />
          {/* Parsed hints */}
          {input && (parsedResult.date || parsedResult.priority !== 4) && (
            <div className="flex items-center gap-2 mt-2 text-xs">
              {parsedResult.date && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-600 rounded-full font-medium">
                  <Calendar size={10} />
                  {parsedResult.date}
                </span>
              )}
              {parsedResult.priority !== 4 && (
                <span
                  className="flex items-center gap-1 px-2.5 py-1 text-white rounded-full font-medium"
                  style={{ backgroundColor: PRIORITY_COLORS[parsedResult.priority] }}
                >
                  <Flag size={10} />
                  P{parsedResult.priority}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-3 border-t border-[var(--border-light)] bg-[var(--bg-hover)]/50">
          {/* Project picker */}
          <div ref={projectPickerRef} className="relative">
            <button
              onClick={() => {
                setShowProjectPicker(!showProjectPicker);
                setShowLabelPicker(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                projectId
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-active)]/60 hover:text-[var(--text-secondary)]'
              }`}
            >
              <Folder size={14} />
              {projectId
                ? projects.find((p) => p.id === projectId)?.name || '项目'
                : '项目'}
            </button>
            {showProjectPicker && (
              <div
                className="absolute bottom-full left-0 mb-2 w-52 bg-[var(--bg-card)] rounded-xl shadow-xl border border-[var(--border-color)] py-1 z-10"
                style={{ animation: 'fadeIn 0.12s ease-out' }}
              >
                <button
                  onClick={() => {
                    setProjectId(null);
                    setShowProjectPicker(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  无项目
                </button>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProjectId(p.id);
                      setShowProjectPicker(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 transition-colors"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority - circular buttons */}
          <div className="flex items-center gap-1 ml-1">
            {([1, 2, 3, 4] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{
                  backgroundColor: priority === p ? PRIORITY_COLORS[p] : '#F3F4F6',
                }}
                title={`P${p}`}
              >
                {priority === p ? (
                  <Check size={12} className="text-white" strokeWidth={3} />
                ) : (
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: PRIORITY_COLORS[p] }}
                  >
                    P{p}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Label picker */}
          <div ref={labelPickerRef} className="relative">
            <button
              onClick={() => {
                setShowLabelPicker(!showLabelPicker);
                setShowProjectPicker(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedLabels.length > 0
                  ? 'bg-purple-50 text-purple-600'
                  : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-active)]/60 hover:text-[var(--text-secondary)]'
              }`}
            >
              <Tag size={14} />
              {selectedLabels.length > 0 ? `${selectedLabels.length}个标签` : '标签'}
            </button>
            {showLabelPicker && (
              <div
                className="absolute bottom-full left-0 mb-2 w-48 bg-[var(--bg-card)] rounded-xl shadow-xl border border-[var(--border-color)] py-1 z-10 max-h-48 overflow-y-auto"
                style={{ animation: 'fadeIn 0.12s ease-out' }}
              >
                {labels.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-[var(--text-tertiary)]">暂无标签</p>
                ) : (
                  labels.map((label) => (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.name)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-hover)] flex items-center gap-2 transition-colors"
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                          selectedLabels.includes(label.name)
                            ? 'bg-[#DC4C3E] border-[#DC4C3E]'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedLabels.includes(label.name) && (
                          <Check size={10} className="text-white" strokeWidth={3} />
                        )}
                      </div>
                      <span className="text-[var(--text-secondary)]">{label.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Date input */}
          <input
            type="date"
            value={parsedResult.date || dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="text-xs text-[var(--text-tertiary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 outline-none bg-[var(--bg-card)]"
          />

          <div className="flex-1" />
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="px-5 py-2 bg-[#DC4C3E] text-white text-sm font-medium rounded-xl hover:bg-[#c4403a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            添加任务
          </button>
        </div>
      </div>
    </div>
  );
}
