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
  const { toggleComplete, deleteTask, setSelectedTaskId, updateTask, tasks, selectedTaskId } = useStore();
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
      className={`group relative flex items-start gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
        isDragging
          ? 'bg-white shadow-xl ring-2 ring-[#DC4C3E]/30 scale-[1.02] rotate-[0.5deg]'
          : isSelected
          ? 'bg-red-50/80 shadow-sm'
          : 'hover:bg-gray-50/80 hover:shadow-sm'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setSelectedTaskId(task.id)}
      {...(dragHandleProps || {})}
    >
      {/* Left priority bar */}
      <div
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full transition-all duration-200 ${
          isSelected ? 'h-8' : hovered ? 'h-6' : 'h-0'
        }`}
        style={{
          backgroundColor: PRIORITY_COLORS[task.priority],
          boxShadow: isSelected ? `0 0 8px ${PRIORITY_COLORS[task.priority]}40` : 'none',
        }}
      />

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
          className={`w-[22px] h-[22px] rounded-[5px] border-2 transition-all duration-200 flex items-center justify-center ${
            task.isCompleted
              ? 'border-transparent shadow-sm'
              : 'border-gray-300 group-hover/check:border-current group-hover/check:shadow-sm'
          }`}
          style={{
            borderColor: task.isCompleted ? 'transparent' : undefined,
            backgroundColor: task.isCompleted ? PRIORITY_COLORS[task.priority] : 'transparent',
            color: PRIORITY_COLORS[task.priority],
            backgroundImage: task.isCompleted
              ? `linear-gradient(135deg, ${PRIORITY_COLORS[task.priority]}, ${PRIORITY_COLORS[task.priority]}dd)`
              : 'none',
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
            className={`text-[14px] leading-5 transition-all duration-300 ${
              task.isCompleted
                ? 'line-through text-gray-400 opacity-60'
                : 'text-gray-800 font-medium'
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
                className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-gray-100 text-gray-600 border border-gray-200/50"
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
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${subtaskProgress.percent}%`,
                  backgroundImage: `linear-gradient(90deg, ${PRIORITY_COLORS[task.priority]}, ${PRIORITY_COLORS[task.priority]}cc)`,
                }}
              />
            </div>
            <span className="text-[10px] text-gray-400 font-medium">
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
            className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium transition-colors ${
              isOverdue
                ? 'text-red-600 bg-red-50 border border-red-100'
                : isToday
                ? 'text-green-600 bg-green-50 border border-green-100'
                : isTomorrow
                ? 'text-blue-600 bg-blue-50 border border-blue-100'
                : task.isCompleted
                ? 'text-gray-400'
                : 'text-gray-500 bg-gray-50 border border-gray-100'
            }`}
          >
            <Calendar size={10} />
            {formatDate(task.dueDate)}
          </span>
        )}

        {/* Priority badge */}
        <span
          className="text-[11px] font-bold px-1.5 py-0.5 rounded-md text-white shadow-sm"
          style={{
            backgroundColor: PRIORITY_COLORS[task.priority],
            boxShadow: `0 1px 3px ${PRIORITY_COLORS[task.priority]}30`,
          }}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>

        {/* Hover actions - slide in from right */}
        <div
          className={`flex items-center gap-0.5 transition-all duration-200 ${
            hovered && !task.isCompleted
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 translate-x-4 pointer-events-none'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              useStore.getState().startTimer(task.id);
            }}
            className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-[#DC4C3E] transition-all duration-150"
            title="开始番茄钟"
          >
            <Timer size={15} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskId(task.id);
            }}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all duration-150"
            title="编辑"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateTask(task.id, { priority: ((task.priority % 4) + 1) as 1 | 2 | 3 | 4 });
            }}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all duration-150"
            title="切换优先级"
          >
            <Flag size={15} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteTask(task.id);
            }}
            className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-all duration-150"
            title="删除"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
