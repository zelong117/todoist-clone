import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Flag, Calendar, Folder, Tag } from 'lucide-react';
import { useStore } from '../store';

const PRIORITY_COLORS: Record<number, string> = {
  1: '#DC4C3E',
  2: '#F59E0B',
  3: '#3B82F6',
  4: '#6B7280',
};

// Simple natural language date parser (Chinese)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        ref={dialogRef}
        className="w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Main input */}
        <div className="px-4 pt-4 pb-2">
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
            placeholder="输入任务标题... (支持自然语言，如 '明天开会')"
            className="w-full text-lg text-gray-800 outline-none placeholder-gray-300"
          />
          {input && (parsedResult.date || parsedResult.priority !== 4) && (
            <div className="flex items-center gap-2 mt-2 text-xs">
              {parsedResult.date && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded-full">
                  <Calendar size={10} />
                  {parsedResult.date}
                </span>
              )}
              {parsedResult.priority !== 4 && (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 text-white rounded-full"
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
        <div className="flex items-center gap-1 px-3 py-2 border-t border-gray-100">
          {/* Project picker */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProjectPicker(!showProjectPicker);
                setShowLabelPicker(false);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                projectId
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}
            >
              <Folder size={14} />
              {projectId
                ? projects.find((p) => p.id === projectId)?.name || '项目'
                : '项目'}
            </button>
            {showProjectPicker && (
              <div className="absolute bottom-full left-0 mb-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={() => {
                    setProjectId(null);
                    setShowProjectPicker(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
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
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority picker */}
          <div className="flex items-center gap-0.5">
            {([1, 2, 3, 4] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`px-1.5 py-1 rounded text-xs font-medium transition-colors ${
                  priority === p ? 'text-white' : 'text-gray-400 hover:bg-gray-100'
                }`}
                style={{
                  backgroundColor: priority === p ? PRIORITY_COLORS[p] : undefined,
                }}
              >
                P{p}
              </button>
            ))}
          </div>

          {/* Label picker */}
          <div className="relative">
            <button
              onClick={() => {
                setShowLabelPicker(!showLabelPicker);
                setShowProjectPicker(false);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                selectedLabels.length > 0
                  ? 'bg-purple-50 text-purple-600'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}
            >
              <Tag size={14} />
              {selectedLabels.length > 0 ? `${selectedLabels.length}个标签` : '标签'}
            </button>
            {showLabelPicker && (
              <div className="absolute bottom-full left-0 mb-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                {labels.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-400">暂无标签</p>
                ) : (
                  labels.map((label) => (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.name)}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                          selectedLabels.includes(label.name)
                            ? 'bg-[#DC4C3E] border-[#DC4C3E]'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedLabels.includes(label.name) && (
                          <svg
                            className="w-2 h-2 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-gray-600">{label.name}</span>
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
            className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 outline-none"
          />

          <div className="flex-1" />
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="px-4 py-1.5 bg-[#DC4C3E] text-white text-sm rounded-lg hover:bg-[#c4403a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            添加任务
          </button>
        </div>
      </div>
    </div>
  );
}
