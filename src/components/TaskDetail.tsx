import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Flag,
  Calendar,
  Tag,
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useStore } from '../store';
import type { Task } from '../types';

const PRIORITY_COLORS: Record<number, string> = {
  1: '#DC4C3E',
  2: '#F59E0B',
  3: '#3B82F6',
  4: '#6B7280',
};

const PRIORITY_LABELS: Record<number, string> = {
  1: '紧急',
  2: '高',
  3: '中',
  4: '低',
};

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
}

export default function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  const { tasks, comments, updateTask, deleteTask, addComment, addTask, labels } = useStore();
  const task = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);

  // Subtasks: tasks whose parentId === this task.id
  const subtasks = useMemo(
    () => tasks.filter((t) => t.parentId === taskId),
    [tasks, taskId]
  );

  // Comments for this task
  const taskComments = useMemo(
    () => comments.filter((c) => c.taskId === taskId),
    [comments, taskId]
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

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

  const handleAddTag = useCallback(() => {
    if (!task || !newTag.trim()) return;
    const lbls = [...(task.labels || []), newTag.trim()];
    updateTask(task.id, { labels: lbls });
    setNewTag('');
    setShowTagInput(false);
  }, [task, newTag, updateTask]);

  const handleRemoveTag = useCallback(
    (tag: string) => {
      if (!task) return;
      const lbls = (task.labels || []).filter((t) => t !== tag);
      updateTask(task.id, { labels: lbls });
    },
    [task, updateTask]
  );

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

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!task) {
    return (
      <div className="w-96 bg-white border-l border-gray-200 flex items-center justify-center text-gray-400">
        任务未找到
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="w-96 bg-white border-l border-gray-200 flex flex-col h-full animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
          />
          <span className="text-xs text-gray-400">
            {task.isCompleted ? '已完成' : '进行中'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          title="关闭 (Esc)"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="w-full text-lg font-semibold text-gray-800 border-none outline-none focus:ring-0 placeholder-gray-300"
          placeholder="任务标题"
        />

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescBlur}
            placeholder="添加描述..."
            className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-[#DC4C3E]/40 resize-none min-h-[80px] transition-colors"
            rows={3}
          />
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">优先级</label>
          <div className="flex gap-2">
            {([1, 2, 3, 4] as const).map((p) => (
              <button
                key={p}
                onClick={() => updateTask(task.id, { priority: p })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  task.priority === p
                    ? 'text-white shadow-sm'
                    : 'text-gray-500 bg-gray-50 hover:bg-gray-100'
                }`}
                style={{
                  backgroundColor: task.priority === p ? PRIORITY_COLORS[p] : undefined,
                }}
              >
                <Flag size={12} />
                P{p}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">截止日期</label>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={task.dueDate || ''}
              onChange={(e) => updateTask(task.id, { dueDate: e.target.value || null })}
              className="text-sm text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#DC4C3E]/40 transition-colors"
            />
            {task.dueDate && (
              <button
                onClick={() => updateTask(task.id, { dueDate: null })}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                清除
              </button>
            )}
          </div>
        </div>

        {/* Labels */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">标签</label>
          <div className="flex flex-wrap gap-1.5">
            {(task.labels || []).map((label) => (
              <span
                key={label}
                className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600 border border-blue-100"
              >
                {label}
                <button
                  onClick={() => handleRemoveTag(label)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            {showTagInput ? (
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                  if (e.key === 'Escape') setShowTagInput(false);
                }}
                onBlur={() => {
                  if (newTag.trim()) handleAddTag();
                  else setShowTagInput(false);
                }}
                autoFocus
                className="px-2 py-0.5 text-xs border border-blue-200 rounded-full outline-none w-20"
                placeholder="标签名"
              />
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-50 text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 transition-colors"
              >
                <Plus size={10} />
                添加
              </button>
            )}
          </div>
        </div>

        {/* Subtasks */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">
            子任务{' '}
            {subtasks.length > 0 && (
              <span className="text-gray-400">
                ({subtasks.filter((s) => s.isCompleted).length}/{subtasks.length})
              </span>
            )}
          </label>
          <div className="space-y-1.5">
            {subtasks.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors"
              >
                <button
                  onClick={() => handleToggleSubtask(sub.id)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    sub.isCompleted
                      ? 'bg-[#DC4C3E] border-[#DC4C3E]'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {sub.isCompleted && (
                    <svg
                      className="w-2.5 h-2.5 text-white"
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
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-gray-300" />
              <input
                type="text"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubtask();
                }}
                placeholder="添加子任务"
                className="flex-1 text-sm text-gray-600 outline-none placeholder-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Comments */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block flex items-center gap-1">
            <MessageSquare size={12} />
            评论
          </label>
          <div className="space-y-2 mb-3">
            {taskComments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">我</span>
                  <span className="text-[10px] text-gray-400">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{comment.content}</p>
              </div>
            ))}
            {taskComments.length === 0 && (
              <p className="text-xs text-gray-300">暂无评论</p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddComment();
              }}
              placeholder="添加评论..."
              className="flex-1 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#DC4C3E]/40 transition-colors"
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="px-3 py-1.5 bg-[#DC4C3E] text-white text-sm rounded-lg hover:bg-[#c4403a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              发送
            </button>
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

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <button
          onClick={() => {
            deleteTask(task.id);
            onClose();
          }}
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg w-full transition-colors"
        >
          <Trash2 size={14} />
          删除任务
        </button>
      </div>
    </div>
  );
}
