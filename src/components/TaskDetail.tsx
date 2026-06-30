import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Calendar,
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useStore } from '../store';

const PRIORITY_COLORS: Record<number, string> = {
  1: '#DC4C3E',
  2: '#F59E0B',
  3: '#3B82F6',
  4: '#6B7280',
};

const PRIORITY_LABELS: Record<number, string> = {
  1: 'P1 紧急',
  2: 'P2 高',
  3: 'P3 中',
  4: 'P4 低',
};

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
}

export default function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  const { tasks, comments, updateTask, deleteTask, addComment, addTask, labels } = useStore();
  const task = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);

  const subtasks = useMemo(
    () => tasks.filter((t) => t.parentId === taskId),
    [tasks, taskId]
  );

  const taskComments = useMemo(
    () => comments.filter((c) => c.taskId === taskId),
    [comments, taskId]
  );

  const completedSubtasks = useMemo(
    () => subtasks.filter((s) => s.isCompleted).length,
    [subtasks]
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
    }
  }, [task]);

  // Close on Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleTitleBlur = useCallback(() => {
    if (task && title.trim() !== task.title) {
      updateTask(task.id, { title: title.trim() });
    }
  }, [task, title, updateTask]);

  const handleDescBlur = useCallback(() => {
    if (task && description !== (task.description || '')) {
      updateTask(task.id, { description: description.trim() });
    }
  }, [task, description, updateTask]);

  const handleAddSubtask = useCallback(() => {
    if (!task || !newSubtask.trim()) return;
    addTask({
      title: newSubtask.trim(),
      description: '',
      projectId: task.projectId,
      sectionId: task.sectionId,
      parentId: task.id,
      priority: task.priority,
      labels: [],
      dueDate: null,
      isRecurring: false,
      recurrenceRule: null,
      isCompleted: false,
      completedAt: null,
      order: subtasks.length,
    });
    setNewSubtask('');
  }, [task, newSubtask, addTask, subtasks.length]);

  const handleAddComment = useCallback(() => {
    if (!task || !newComment.trim()) return;
    addComment({
      taskId: task.id,
      content: newComment.trim(),
    });
    setNewComment('');
  }, [task, newComment, addComment]);

  const handleToggleSubtask = useCallback(
    (subtaskId: string) => {
      const sub = tasks.find((t) => t.id === subtaskId);
      if (!sub) return;
      updateTask(subtaskId, {
        isCompleted: !sub.isCompleted,
        completedAt: !sub.isCompleted ? new Date().toISOString() : null,
      });
    },
    [tasks, updateTask]
  );

  const handleToggleLabel = useCallback(
    (labelName: string) => {
      if (!task) return;
      const currentLabels = task.labels || [];
      const newLabels = currentLabels.includes(labelName)
        ? currentLabels.filter((l) => l !== labelName)
        : [...currentLabels, labelName];
      updateTask(task.id, { labels: newLabels });
    },
    [task, updateTask]
  );

  const handleSetDate = useCallback(
    (date: string | null) => {
      if (!task) return;
      updateTask(task.id, { dueDate: date });
      setShowDatePicker(false);
    },
    [task, updateTask]
  );

  const getQuickDate = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCommentDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}小时前`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}天前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  if (!task) {
    return (
      <div className="w-[420px] bg-white border-l border-gray-200 flex items-center justify-center text-gray-400">
        任务未找到
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="w-[420px] bg-white border-l border-gray-200 flex flex-col h-full"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
          />
          <span className="text-xs text-gray-400 font-medium">
            {task.isCompleted ? '已完成' : '进行中'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          title="关闭 (Esc)"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="w-full text-lg font-semibold text-gray-900 border-none outline-none focus:ring-0 placeholder-gray-300 leading-tight"
          placeholder="任务标题"
        />

        {/* Description */}
        <div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescBlur}
            placeholder="添加描述..."
            className="w-full text-sm text-gray-600 border border-gray-200 rounded-xl p-3 outline-none focus:border-[#DC4C3E]/40 resize-none min-h-[80px] transition-colors bg-gray-50/50"
            rows={3}
          />
        </div>

        {/* Priority Selector */}
        <div className="relative">
          <label className="text-xs font-medium text-gray-500 mb-2 block uppercase tracking-wide">优先级</label>
          <div className="flex items-center gap-2">
            {([1, 2, 3, 4] as const).map((p) => (
              <button
                key={p}
                onClick={() => updateTask(task.id, { priority: p })}
                className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all group"
                style={{
                  backgroundColor: task.priority === p ? PRIORITY_COLORS[p] : '#F3F4F6',
                }}
                title={PRIORITY_LABELS[p]}
              >
                {task.priority === p ? (
                  <Check size={16} className="text-white" strokeWidth={3} />
                ) : (
                  <span
                    className="text-xs font-bold"
                    style={{ color: PRIORITY_COLORS[p] }}
                  >
                    P{p}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <div ref={datePickerRef} className="relative">
          <label className="text-xs font-medium text-gray-500 mb-2 block uppercase tracking-wide">截止日期</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors text-sm text-gray-600 flex-1"
            >
              <Calendar size={16} className="text-gray-400" />
              <span>{task.dueDate || '设置日期'}</span>
              <ChevronDown size={14} className="text-gray-400 ml-auto" />
            </button>
            {task.dueDate && (
              <button
                onClick={() => handleSetDate(null)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1"
              >
                清除
              </button>
            )}
          </div>
          {showDatePicker && (
            <div
              className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-3 z-20"
              style={{ animation: 'fadeIn 0.15s ease-out' }}
            >
              {/* Quick options */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <button
                  onClick={() => handleSetDate(getQuickDate(0))}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                >
                  今天
                </button>
                <button
                  onClick={() => handleSetDate(getQuickDate(1))}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                >
                  明天
                </button>
                <button
                  onClick={() => handleSetDate(getQuickDate(7))}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                >
                  下周
                </button>
              </div>
              <input
                type="date"
                value={task.dueDate || ''}
                onChange={(e) => handleSetDate(e.target.value || null)}
                className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#DC4C3E]/40 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Labels */}
        <div ref={tagDropdownRef} className="relative">
          <label className="text-xs font-medium text-gray-500 mb-2 block uppercase tracking-wide">标签</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(task.labels || []).map((label) => (
              <span
                key={label}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-medium"
              >
                {label}
                <button
                  onClick={() => handleToggleLabel(label)}
                  className="hover:text-red-500 transition-colors ml-0.5"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-gray-50 text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 transition-colors"
            >
              <Plus size={12} />
              添加标签
            </button>
          </div>
          {showTagDropdown && (
            <div
              className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-20 max-h-48 overflow-y-auto"
              style={{ animation: 'fadeIn 0.15s ease-out' }}
            >
              {labels.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-400">暂无可用标签</p>
              ) : (
                labels.map((label) => {
                  const isSelected = (task.labels || []).includes(label.name);
                  return (
                    <button
                      key={label.id}
                      onClick={() => handleToggleLabel(label.name)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-[#DC4C3E] border-[#DC4C3E]'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className={isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}>
                        {label.name}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Subtasks */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block uppercase tracking-wide">
            子任务
            {subtasks.length > 0 && (
              <span className="text-gray-400 ml-1 normal-case">
                ({completedSubtasks}/{subtasks.length})
              </span>
            )}
          </label>
          {/* Progress bar */}
          {subtasks.length > 0 && (
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
              <div
                className="bg-[#DC4C3E] h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0}%`,
                }}
              />
            </div>
          )}
          <div className="space-y-1">
            {subtasks.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <button
                  onClick={() => handleToggleSubtask(sub.id)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    sub.isCompleted
                      ? 'bg-[#DC4C3E] border-[#DC4C3E]'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {sub.isCompleted && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span
                  className={`text-sm flex-1 ${
                    sub.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'
                  }`}
                >
                  {sub.title}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                <Plus size={10} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubtask();
                }}
                placeholder="添加子任务..."
                className="flex-1 text-sm text-gray-600 outline-none placeholder-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Comments */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-3 block flex items-center gap-1.5 uppercase tracking-wide">
            <MessageSquare size={13} />
            评论
          </label>
          <div className="space-y-3 mb-3">
            {taskComments.map((comment) => (
              <div key={comment.id} className="flex gap-2.5">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  W
                </div>
                {/* Bubble */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-700">我</span>
                    <span className="text-[10px] text-gray-400">
                      {formatCommentDate(comment.createdAt)}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-gray-700 inline-block max-w-full">
                    {comment.content}
                  </div>
                </div>
              </div>
            ))}
            {taskComments.length === 0 && (
              <p className="text-xs text-gray-300 pl-10">暂无评论</p>
            )}
          </div>
          {/* New comment input */}
          <div className="flex gap-2 items-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              W
            </div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddComment();
                }}
                placeholder="写评论..."
                className="flex-1 text-sm text-gray-600 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#DC4C3E]/40 transition-colors"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-[#DC4C3E] text-white text-sm font-medium rounded-xl hover:bg-[#c4403a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                发送
              </button>
            </div>
          </div>
        </div>

        {/* Meta info */}
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock size={12} />
            <span>创建于 {formatDate(task.createdAt)}</span>
          </div>
          {task.completedAt && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <CheckCircle2 size={12} />
              <span>完成于 {formatDate(task.completedAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Delete */}
      <div className="px-5 py-3 border-t border-gray-100">
        {showDeleteConfirm ? (
          <div className="flex items-center gap-2 animate-fade-in">
            <span className="text-sm text-gray-600 flex-1">确认删除此任务？</span>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => {
                deleteTask(task.id);
                onClose();
              }}
              className="px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors font-medium"
            >
              删除
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl w-full transition-colors"
          >
            <Trash2 size={14} />
            删除任务
          </button>
        )}
      </div>
    </div>
  );
}
