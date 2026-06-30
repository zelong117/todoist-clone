import { useState, useMemo } from 'react';
import { Pencil, Trash2, Flag, Calendar, Timer } from 'lucide-react';
import type { Task } from '../types';
import { useStore } from '../store';

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
  const { toggleComplete, deleteTask, setSelectedTaskId, updateTask, tasks } = useStore();

  // Subtasks are tasks with parentId === this task's id
  const subtasks = useMemo(
    () => tasks.filter((t) => t.parentId === task.id),
    [tasks, task.id]
  );

  const isOverdue = useMemo(() => {
    if (!task.dueDate || task.isCompleted) return false;
    const today = new Date().toISOString().split('T')[0];
    return task.dueDate < today;
  }, [task.dueDate, task.isCompleted]);

  const subtaskProgress = useMemo(() => {
    if (subtasks.length === 0) return null;
    const done = subtasks.filter((s) => s.isCompleted).length;
    return { done, total: subtasks.length, percent: (done / subtasks.length) * 100 };
  }, [subtasks]);

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
      className={`group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer ${
        isDragging
          ? 'bg-white shadow-lg ring-2 ring-[#DC4C3E]/30 opacity-90'
          : 'hover:bg-gray-50'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setSelectedTaskId(task.id)}
      {...(dragHandleProps || {})}
    >
      {/* Custom Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleComplete(task.id);
        }}
        className="flex-shrink-0 mt-0.5 relative group/check"
        style={{ width: 20, height: 20 }}
      >
        <div
          className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
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
          {/* Priority indicator */}
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
          />
          <span
            className={`text-sm leading-5 transition-all duration-200 ${
              task.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'
            }`}
          >
            {task.title}
          </span>
        </div>

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {task.labels.map((label) => (
              <span
                key={label}
                className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 text-blue-600 border border-blue-100"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Subtask Progress */}
        {subtaskProgress && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#DC4C3E] rounded-full transition-all duration-300"
                style={{ width: `${subtaskProgress.percent}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400">
              {subtaskProgress.done}/{subtaskProgress.total}
            </span>
          </div>
        )}
      </div>

      {/* Right side info */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Due Date */}
        {task.dueDate && (
          <span
            className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
              isOverdue
                ? 'text-red-600 bg-red-50'
                : task.isCompleted
                ? 'text-gray-400'
                : 'text-gray-500 bg-gray-100'
            }`}
          >
            <Calendar size={10} />
            {formatDate(task.dueDate)}
          </span>
        )}

        {/* Priority badge */}
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
          style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>

        {/* Hover actions */}
        {hovered && !task.isCompleted && (
          <div className="flex items-center gap-0.5 animate-in fade-in duration-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                useStore.getState().startTimer(task.id);
              }}
              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-[#DC4C3E] transition-colors"
              title="开始番茄钟"
            >
              <Timer size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTaskId(task.id);
              }}
              className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              title="编辑"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateTask(task.id, { priority: ((task.priority % 4) + 1) as 1 | 2 | 3 | 4 });
              }}
              className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              title="切换优先级"
            >
              <Flag size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteTask(task.id);
              }}
              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
              title="删除"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
