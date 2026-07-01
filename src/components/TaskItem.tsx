import { useState, useMemo } from 'react';
import { Pencil, Trash2, Clock, MessageSquare, Calendar, Timer, Pause } from 'lucide-react';
import type { Task } from '../types';
import { useStore } from '../store';
import { formatTimer } from '../utils';

const PRIORITY_COLORS: Record<number, string> = {
  1: '#DC4C3E',
  2: '#F59E0B',
  3: '#3B82F6',
  4: '#6B7280',
};

const PRIORITY_LABELS: Record<number, string> = {
  1: 'P1',
  2: 'P2',
  3: 'P3',
  4: 'P4',
};

interface TaskItemProps {
  task: Task;
  isDragging?: boolean;
  dragHandleProps?: Record<string, any>;
}

export default function TaskItem({ task, isDragging, dragHandleProps }: TaskItemProps) {
  const [hovered, setHovered] = useState(false);
  const {
    toggleComplete,
    deleteTask,
    setSelectedTaskId,
    tasks,
    selectedTaskId,
    activeTimerTaskId,
    timerSeconds,
    timerStatus,
    startTimer,
    pauseTimer,
    resumeTimer,
  } = useStore();
  const isSelected = selectedTaskId === task.id;

  const subtasks = useMemo(
    () => tasks.filter((t) => t.parentId === task.id),
    [tasks, task.id]
  );

  const isOverdue = useMemo(() => {
    if (!task.dueDate || task.isCompleted) return false;
    const today = new Date().toISOString().split('T')[0];
    return task.dueDate < today;
  }, [task.dueDate, task.isCompleted]);

  const isToday = useMemo(() => {
    if (!task.dueDate) return false;
    return task.dueDate === new Date().toISOString().split('T')[0];
  }, [task.dueDate]);

  const isTomorrow = useMemo(() => {
    if (!task.dueDate) return false;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return task.dueDate === tomorrow.toISOString().split('T')[0];
  }, [task.dueDate]);

  const subtaskProgress = useMemo(() => {
    if (subtasks.length === 0) return null;
    const done = subtasks.filter((s) => s.isCompleted).length;
    return { done, total: subtasks.length, percent: (done / subtasks.length) * 100 };
  }, [subtasks]);

  const isTimerActive = activeTimerTaskId === task.id && (timerStatus === 'running' || timerStatus === 'paused');

  const handleTimerToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTimerTaskId === task.id) {
      if (timerStatus === 'running') {
        pauseTimer();
      } else if (timerStatus === 'paused') {
        resumeTimer();
      }
    } else {
      startTimer(task.id);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.getTime() === today.getTime()) return '今天';
    if (date.getTime() === tomorrow.getTime()) return '明天';
    if (date.getTime() === yesterday.getTime()) return '昨天';

    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  };

  return (
    <div
      className={`group relative flex items-start gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer ${
        isDragging
          ? 'bg-[var(--bg-card)] shadow-xl ring-2 ring-[#DC4C3E]/30 scale-[1.02]'
          : isSelected
          ? 'bg-blue-50/80'
          : 'hover:bg-[var(--bg-hover)]'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setSelectedTaskId(task.id)}
      {...(dragHandleProps || {})}
    >
      {/* Circular Checkbox - Todoist style */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleComplete(task.id);
        }}
        className="flex-shrink-0 mt-0.5 relative group/check"
        style={{ width: 20, height: 20 }}
      >
        <div
          className={`w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
            task.isCompleted
              ? 'border-transparent'
              : 'border-gray-300 group-hover/check:border-current'
          }`}
          style={{
            borderColor: task.isCompleted ? 'transparent' : undefined,
            backgroundColor: task.isCompleted ? PRIORITY_COLORS[task.priority] : 'transparent',
            color: PRIORITY_COLORS[task.priority],
          }}
        >
          {task.isCompleted && (
            <svg
              className="w-3 h-3 text-white animate-[checkmark_0.2s_ease-in-out]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-[15px] font-medium leading-5 transition-all duration-200 ${
              task.isCompleted
                ? 'line-through text-[var(--text-tertiary)] opacity-60'
                : 'text-[var(--text-primary)]'
            }`}
          >
            {task.title}
          </span>
        </div>

        {/* Timer info - show when this task's timer is active */}
        {isTimerActive && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-medium">
              <Timer size={10} />
              <span>{formatTimer(timerSeconds)}</span>
              <span className="animate-pulse">●</span>
            </div>
          </div>
        )}

        {/* Pomodoro count - show when task has completed pomodoros */}
        {task.pomodoroCount > 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs text-orange-500">
            <span>🍅</span>
            <span>{task.pomodoroCount}</span>
          </div>
        )}

        {/* Labels as pills */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {task.labels.map((label) => (
              <span
                key={label}
                className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Subtask Progress */}
        {subtaskProgress && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${subtaskProgress.percent}%`,
                  backgroundColor: PRIORITY_COLORS[task.priority],
                }}
              />
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
              {subtaskProgress.done}/{subtaskProgress.total}
            </span>
          </div>
        )}
      </div>

      {/* Right side: Date, Priority, Timer button, Hover actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Due Date */}
        {task.dueDate && (
          <span
            className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded font-medium transition-colors ${
              isOverdue
                ? 'text-red-700 bg-red-100 font-semibold'
                : isToday
                ? 'text-green-700 bg-green-100 font-semibold'
                : isTomorrow
                ? 'text-blue-600 bg-blue-50 font-semibold'
                : task.isCompleted
                ? 'text-[var(--text-tertiary)]'
                : 'text-[var(--text-tertiary)] bg-[var(--bg-hover)]'
            }`}
          >
            <Calendar size={10} />
            {formatDate(task.dueDate)}
          </span>
        )}

        {/* Priority indicator */}
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm"
          style={{
            color: PRIORITY_COLORS[task.priority],
            backgroundColor: `${PRIORITY_COLORS[task.priority]}20`,
          }}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>

        {/* Timer button - always visible for non-completed tasks */}
        {!task.isCompleted && (
          <button
            onClick={handleTimerToggle}
            className={`p-1.5 rounded-lg transition-all duration-150 z-20 ${
              activeTimerTaskId === task.id
                ? 'bg-red-100 text-red-500 animate-pulse shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-red-100 hover:text-red-500'
            }`}
            title={activeTimerTaskId === task.id ? '暂停计时' : '开始番茄钟'}
          >
            {activeTimerTaskId === task.id ? <Pause size={16} /> : <Timer size={16} />}
          </button>
        )}

        {/* Hover actions */}
        <div
          className={`flex items-center gap-0.5 transition-all duration-150 z-20 ${
            hovered && !task.isCompleted
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 translate-x-2 pointer-events-none'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskId(task.id);
            }}
            className="p-1 rounded hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            title="安排日期"
          >
            <Clock size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskId(task.id);
            }}
            className="p-1 rounded hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            title="编辑"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskId(task.id);
            }}
            className="p-1 rounded hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            title="评论"
          >
            <MessageSquare size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteTask(task.id);
            }}
            className="p-1 rounded hover:bg-red-100 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
            title="删除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
