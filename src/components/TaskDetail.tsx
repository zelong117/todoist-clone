import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Calendar,
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  Check,
  Paperclip,
  Image as ImageIcon,
  Bell,
  MapPin,
  Flag,
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
  const { tasks, comments, projects, sections, updateTask, deleteTask, addComment, addTask, labels, setSelectedTaskId } = useStore();
  const task = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);

  // Find sibling tasks for navigation
  const siblingTasks = useMemo(() => {
    if (!task) return [];
    return tasks
      .filter(
        (t) =>
          !t.isCompleted &&
          t.parentId === task.parentId &&
          t.projectId === task.projectId &&
          t.sectionId === task.sectionId
      )
      .sort((a, b) => a.order - b.order);
  }, [tasks, task]);

  const currentIndex = useMemo(() => {
    if (!task) return -1;
    return siblingTasks.findIndex((t) => t.id === task.id);
  }, [siblingTasks, task]);

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

  const currentProject = useMemo(
    () => (task?.projectId ? projects.find((p) => p.id === task.projectId) : null),
    [projects, task]
  );

  const currentSection = useMemo(
    () => (task?.sectionId ? sections.find((s) => s.id === task.sectionId) : null),
    [sections, task]
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setShowDescription(!!task.description);
    }
  }, [task]);

  // Close on Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // Arrow navigation
      if (e.key === 'ArrowUp' && e.altKey) {
        e.preventDefault();
        navigateTask(-1);
      }
      if (e.key === 'ArrowDown' && e.altKey) {
        e.preventDefault();
        navigateTask(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, currentIndex, siblingTasks]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) {
        setShowPriorityPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const navigateTask = useCallback(
    (direction: number) => {
      if (siblingTasks.length === 0) return;
      const newIndex = currentIndex + direction;
      if (newIndex >= 0 && newIndex < siblingTasks.length) {
        setSelectedTaskId(siblingTasks[newIndex].id);
      }
    },
    [siblingTasks, currentIndex, setSelectedTaskId]
  );

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
      pomodoroCount: 0,
      plannedPomodoros: 1,
      completedPomodoros: 0,
      estimatedMinutes: 25,
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

  const formatDateDisplay = (iso: string | null) => {
    if (!iso) return '未设置';
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return '今天';
    if (d.toDateString() === tomorrow.toDateString()) return '明天';

    return d.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  if (!task) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ animation: 'fadeIn 0.15s ease-out' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={panelRef}
        className="relative w-full max-w-[740px] max-h-[88vh] bg-[var(--bg-card)] rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-4"
        style={{ animation: 'slideUp 0.25s ease-out', boxShadow: '0 25px 60px -12px rgba(0,0,0,0.25)' }}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2.5 text-sm text-[var(--text-tertiary)]">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-active)]">
              <span className="text-[var(--text-tertiary)] font-bold">#</span>
              <span className="font-medium">{currentProject?.name || '收件箱'}</span>
            </div>
            {currentSection && (
              <>
                <span className="text-[var(--text-secondary)]">/</span>
                <span className="font-medium">{currentSection.name}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => navigateTask(-1)}
              disabled={currentIndex <= 0}
              className="p-2 rounded-xl hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title="上一个任务"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={() => navigateTask(1)}
              disabled={currentIndex >= siblingTasks.length - 1}
              className="p-2 rounded-xl hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title="下一个任务"
            >
              <ChevronDown size={16} />
            </button>
            <button
              className="p-2 rounded-xl hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all duration-200"
              title="更多"
            >
              <MoreHorizontal size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all duration-200"
              title="关闭 (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            {/* Left Panel - Main Content */}
            <div className="flex-1 px-7 py-6 space-y-5 min-w-0">
              {/* Checkbox + Title */}
              <div className="flex items-start gap-3.5">
                <button
                  onClick={() =>
                    updateTask(task.id, {
                      isCompleted: !task.isCompleted,
                      completedAt: !task.isCompleted ? new Date().toISOString() : null,
                    })
                  }
                  className={`mt-2 w-6 h-6 rounded-full border-[2.5px] flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                    task.isCompleted
                      ? 'bg-[#DC4C3E] border-[#DC4C3E] shadow-md shadow-red-500/25'
                      : 'border-gray-300 hover:border-[var(--text-secondary)] hover:scale-110'
                  }`}
                >
                  {task.isCompleted && (
                    <Check size={14} className="text-white" strokeWidth={3} />
                  )}
                </button>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="flex-1 text-xl font-bold text-[var(--text-primary)] bg-transparent border-none outline-none focus:ring-0 placeholder-[var(--text-tertiary)] leading-tight"
                  placeholder="任务标题"
                />
              </div>

              {/* Pomodoro Progress - only if project enables pomodoro */}
              {currentProject?.usePomodoro && task.plannedPomodoros > 0 && (
                <div className="flex items-center gap-4 mb-4 p-4 bg-gradient-to-r from-orange-50/50 to-red-50/30 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: task.plannedPomodoros }).map((_, i) => (
                      <span key={i} className={`text-xl transition-all duration-300 ${i < task.completedPomodoros ? 'scale-110' : 'opacity-25 grayscale'}`}>🍅</span>
                    ))}
                  </div>
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    {task.completedPomodoros}/{task.plannedPomodoros}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)] font-medium">
                    = {task.plannedPomodoros * 25}m
                  </span>
                </div>
              )}

              {/* Pomodoro Completed Celebration - only if project enables pomodoro */}
              {currentProject?.usePomodoro && task.completedPomodoros >= task.plannedPomodoros && task.plannedPomodoros > 0 && (
                <div className="text-center py-2">
                  <span className="text-3xl animate-bounce">🎉</span>
                  <p className="text-xs text-green-500 font-bold mt-1">番茄任务完成！</p>
                </div>
              )}

              {/* Description */}
              <div className="pl-9">
                {showDescription || description ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleDescBlur}
                    placeholder="添加描述..."
                    className="w-full text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl p-3.5 outline-none focus:border-[#DC4C3E]/40 focus:ring-2 focus:ring-[#DC4C3E]/10 resize-none min-h-[80px] transition-all duration-200 placeholder-[var(--text-tertiary)]"
                    rows={3}
                  />
                ) : (
                  <button
                    onClick={() => setShowDescription(true)}
                    className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all duration-200 py-2.5"
                  >
                    <span className="text-lg leading-none">≡</span>
                    <span>添加描述</span>
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-[var(--border-color)] ml-9" />

              {/* Subtasks */}
              <div className="pl-9">
                <label className="text-[11px] font-bold text-[var(--text-tertiary)] mb-2.5 block uppercase tracking-widest">
                  子任务
                  {subtasks.length > 0 && (
                    <span className="text-[var(--text-secondary)] ml-1.5 normal-case tracking-normal font-medium">
                      ({completedSubtasks}/{subtasks.length})
                    </span>
                  )}
                </label>
                {/* Progress bar */}
                {subtasks.length > 0 && (
                  <div className="w-full bg-[var(--bg-active)] rounded-full h-2 mb-4">
                    <div
                      className="bg-gradient-to-r from-[#DC4C3E] to-[#E85D4A] h-2 rounded-full transition-all duration-500 shadow-sm"
                      style={{
                        width: `${subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  {subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-[var(--bg-hover)]/50 transition-all duration-200 group"
                    >
                      <button
                        onClick={() => handleToggleSubtask(sub.id)}
                        className={`w-5 h-5 rounded-full border-[2px] flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                          sub.isCompleted
                            ? 'bg-[#DC4C3E] border-[#DC4C3E]'
                            : 'border-gray-300 hover:border-[var(--text-secondary)] hover:scale-110'
                        }`}
                      >
                        {sub.isCompleted && (
                          <Check size={11} className="text-white" strokeWidth={3} />
                        )}
                      </button>
                      <span
                        className={`text-sm font-medium flex-1 transition-all duration-200 ${
                          sub.isCompleted ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {sub.title}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 px-3.5 py-2.5">
                    <div className="w-5 h-5 rounded-full border-2 border-dashed border-[var(--border-color)] flex items-center justify-center flex-shrink-0">
                      <Plus size={10} className="text-[var(--text-tertiary)]" />
                    </div>
                    <input
                      type="text"
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddSubtask();
                      }}
                      placeholder="添加子任务..."
                      className="flex-1 text-sm text-[var(--text-tertiary)] outline-none placeholder-[var(--text-tertiary)] bg-transparent font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[var(--border-color)] ml-9" />

              {/* Comments */}
              <div className="pl-9">
                <label className="text-[11px] font-bold text-[var(--text-tertiary)] mb-3 block flex items-center gap-1.5 uppercase tracking-widest">
                  <MessageSquare size={13} />
                  评论
                </label>
                <div className="space-y-3.5 mb-3">
                  {taskComments.map((comment) => (
                    <div key={comment.id} className="flex gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-sm">
                        W
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold text-[var(--text-primary)]">我</span>
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {formatCommentDate(comment.createdAt)}
                          </span>
                        </div>
                        <div className="bg-[var(--bg-hover)] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-[var(--text-primary)] inline-block max-w-full font-medium">
                          {comment.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  {taskComments.length === 0 && (
                    <p className="text-xs text-[var(--text-secondary)] pl-10 font-medium">暂无评论</p>
                  )}
                </div>
                {/* New comment input */}
                <div className="flex gap-2.5 items-center">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-sm">
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
                      placeholder="输入评论..."
                      className="flex-1 text-sm text-[var(--text-primary)] bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 outline-none focus:border-[#DC4C3E]/40 focus:ring-2 focus:ring-[#DC4C3E]/10 transition-all duration-200 placeholder-[var(--text-tertiary)] font-medium"
                    />
                    <button
                      className="p-2.5 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-200"
                      title="添加附件"
                    >
                      <Paperclip size={16} />
                    </button>
                    <button
                      className="p-2.5 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-200"
                      title="添加图片"
                    >
                      <ImageIcon size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Properties */}
            <div className="w-[280px] border-l border-[var(--border-color)] px-5 py-6 space-y-4 flex-shrink-0 bg-[var(--bg-secondary)]/30">
              {/* Project */}
              <div className="flex items-center justify-between group">
                <span className="text-[11px] font-bold text-[var(--text-tertiary)] w-16 uppercase tracking-wider">项目</span>
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <span
                    className="w-3 h-3 rounded-md shadow-sm"
                    style={{ backgroundColor: currentProject?.color || '#6B7280' }}
                  />
                  <span className="truncate max-w-[140px] font-medium">
                    {currentProject?.name || '收件箱'}
                  </span>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center justify-between group relative" ref={datePickerRef}>
                <span className="text-[11px] font-bold text-[var(--text-tertiary)] w-16 uppercase tracking-wider">日期</span>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <span>{formatDateDisplay(task.dueDate)}</span>
                  {task.dueDate ? (
                    <span className="text-[var(--text-primary)]">📅</span>
                  ) : (
                    <Plus size={14} className="text-[var(--text-tertiary)]" />
                  )}
                </button>
                {showDatePicker && (
                  <div
                    className="absolute top-full right-0 mt-1.5 w-64 bg-[var(--bg-card)] rounded-2xl shadow-xl border border-[var(--border-color)] p-3.5 z-20"
                    style={{ animation: 'fadeIn 0.15s ease-out' }}
                  >
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <button
                        onClick={() => handleSetDate(getQuickDate(0))}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--bg-active)] hover:bg-[var(--bg-active)] text-[var(--text-primary)] transition-all duration-200"
                      >
                        今天
                      </button>
                      <button
                        onClick={() => handleSetDate(getQuickDate(1))}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--bg-active)] hover:bg-[var(--bg-active)] text-[var(--text-primary)] transition-all duration-200"
                      >
                        明天
                      </button>
                      <button
                        onClick={() => handleSetDate(getQuickDate(7))}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--bg-active)] hover:bg-[var(--bg-active)] text-[var(--text-primary)] transition-all duration-200"
                      >
                        下周
                      </button>
                    </div>
                    <input
                      type="date"
                      value={task.dueDate || ''}
                      onChange={(e) => handleSetDate(e.target.value || null)}
                      className="w-full text-sm text-[var(--text-primary)] bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 outline-none focus:border-[#DC4C3E]/40 focus:ring-2 focus:ring-[#DC4C3E]/10 transition-all duration-200"
                    />
                    {task.dueDate && (
                      <button
                        onClick={() => handleSetDate(null)}
                        className="w-full mt-2 text-xs text-[var(--text-tertiary)] hover:text-red-500 transition-colors py-1.5 font-medium"
                      >
                        清除日期
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div className="flex items-center justify-between group relative">
                <span className="text-[11px] font-bold text-[var(--text-tertiary)] w-16 uppercase tracking-wider">截止</span>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Calendar size={14} />
                  <span>{formatDateDisplay(task.dueDate)}</span>
                </button>
              </div>

              {/* Priority */}
              <div className="flex items-center justify-between group relative" ref={priorityRef}>
                <span className="text-[11px] font-bold text-[var(--text-tertiary)] w-16 uppercase tracking-wider">优先级</span>
                <button
                  onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                  className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-md shadow-sm"
                    style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                  />
                  <span>{PRIORITY_LABELS[task.priority]}</span>
                  <Flag size={14} style={{ color: PRIORITY_COLORS[task.priority] }} />
                </button>
                {showPriorityPicker && (
                  <div
                    className="absolute top-full right-0 mt-1.5 w-60 bg-[var(--bg-card)] rounded-2xl shadow-xl border border-[var(--border-color)] p-4 z-20"
                    style={{ animation: 'fadeIn 0.15s ease-out' }}
                  >
                    <div className="grid grid-cols-4 gap-2">
                      {([1, 2, 3, 4] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => {
                            updateTask(task.id, { priority: p });
                            setShowPriorityPicker(false);
                          }}
                          className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-[var(--bg-active)] transition-all duration-200"
                          style={{ transform: task.priority === p ? 'scale(1.05)' : undefined }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.transform = task.priority === p ? 'scale(1.05)' : 'scale(1)';
                          }}
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs transition-all duration-200"
                            style={{
                              backgroundColor: PRIORITY_COLORS[p],
                              boxShadow: task.priority === p ? `0 0 16px ${PRIORITY_COLORS[p]}60` : 'none',
                            }}
                          >
                            {task.priority === p ? (
                              <Check size={16} className="text-white" strokeWidth={3} />
                            ) : (
                              <span className="text-sm font-bold">{`P${p}`}</span>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold ${task.priority === p ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                            {PRIORITY_LABELS[p]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Labels */}
              <div className="group relative" ref={tagDropdownRef}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-[var(--text-tertiary)] w-16 uppercase tracking-wider">标签</span>
                  <button
                    onClick={() => setShowTagDropdown(!showTagDropdown)}
                    className="flex items-center gap-1 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(task.labels || []).map((label) => {
                    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
                      '紧急': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/35' },
                      '重要': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/35' },
                      '低优先': { bg: 'bg-gray-500/20', text: 'text-[var(--text-secondary)]', border: 'border-[var(--text-tertiary)]/35' },
                      '会议': { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/35' },
                      '工作': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/35' },
                      '个人': { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/35' },
                      '学习': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/35' },
                    };
                    const colors = colorMap[label] || { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' };
                    return (
                      <span
                        key={label}
                        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-full ${colors.bg} ${colors.text} border ${colors.border} font-bold cursor-pointer hover:opacity-80 transition-opacity duration-200`}
                      >
                        {label}
                        <button
                          onClick={() => handleToggleLabel(label)}
                          className="hover:text-red-400 transition-colors ml-0.5"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
                  {(!task.labels || task.labels.length === 0) && !showTagDropdown && (
                    <button
                      onClick={() => setShowTagDropdown(true)}
                      className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-tertiary)] transition-colors font-medium"
                    >
                      + 添加标签
                    </button>
                  )}
                </div>
                {showTagDropdown && (
                  <div
                    className="absolute top-full right-0 mt-1.5 w-52 bg-[var(--bg-card)] rounded-2xl shadow-xl border border-[var(--border-color)] py-1.5 z-20 max-h-48 overflow-y-auto"
                    style={{ animation: 'fadeIn 0.15s ease-out' }}
                  >
                    {(() => {
                      const presetLabels = ['紧急', '重要', '低优先', '会议', '工作', '个人', '学习'];
                      const storeLabelNames = labels.map((l) => l.name);
                      const allLabels = [...new Set([...presetLabels, ...storeLabelNames])];
                      const colorMap: Record<string, string> = {
                        '紧急': '🔴',
                        '重要': '🟠',
                        '低优先': '⚪',
                        '会议': '🟣',
                        '工作': '🔵',
                        '个人': '🟢',
                        '学习': '🔷',
                      };
                      return allLabels.map((labelName) => {
                        const isSelected = (task.labels || []).includes(labelName);
                        return (
                          <button
                            key={labelName}
                            onClick={() => handleToggleLabel(labelName)}
                            className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-[var(--bg-active)] flex items-center gap-2 transition-colors duration-200"
                          >
                            <div
                              className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                                isSelected
                                  ? 'bg-[#DC4C3E] border-[#DC4C3E]'
                                  : 'border-[var(--border-color)]'
                              }`}
                              style={{ width: 18, height: 18 }}
                            >
                              {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                            </div>
                            <span>{colorMap[labelName] || '🏷️'}</span>
                            <span className={`font-medium ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                              {labelName}
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* Pomodoro Settings - only if project enables pomodoro */}
              {currentProject?.usePomodoro && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[11px] font-bold text-[var(--text-tertiary)] w-16 uppercase tracking-wider">🍅 番茄</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateTask(task.id, { plannedPomodoros: Math.max(1, task.plannedPomodoros - 1), estimatedMinutes: Math.max(1, task.plannedPomodoros - 1) * 25 })}
                    className="w-7 h-7 rounded-lg bg-[var(--bg-active)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] flex items-center justify-center text-sm font-bold transition-all duration-200"
                  >-</button>
                  <span className="text-sm font-bold text-[var(--text-primary)] min-w-[44px] text-center">
                    {task.completedPomodoros}/{task.plannedPomodoros}
                  </span>
                  <button
                    onClick={() => updateTask(task.id, { plannedPomodoros: task.plannedPomodoros + 1, estimatedMinutes: (task.plannedPomodoros + 1) * 25 })}
                    className="w-7 h-7 rounded-lg bg-[var(--bg-active)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] flex items-center justify-center text-sm font-bold transition-all duration-200"
                  >+</button>
                  <span className="text-xs text-[var(--text-tertiary)] font-medium">= {task.plannedPomodoros * 25}m</span>
                </div>
              </div>
              )}

              {/* Reminders */}
              <div className="flex items-center justify-between group">
                <span className="text-[11px] font-bold text-[var(--text-tertiary)] w-16 uppercase tracking-wider">提醒</span>
                <button
                  onClick={() => {
                    const reminder = prompt('输入提醒时间 (YYYY-MM-DD HH:MM)：');
                    if (reminder) {
                      alert(`提醒已设置: ${reminder}`);
                    }
                  }}
                  className="flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors font-medium"
                >
                  <Bell size={14} />
                  <span>+ 添加提醒</span>
                </button>
              </div>

              {/* Location */}
              <div className="flex items-center justify-between group">
                <span className="text-[11px] font-bold text-[var(--text-tertiary)] w-16 uppercase tracking-wider">地点</span>
                <button
                  onClick={() => {
                    const location = prompt('输入地点：');
                    if (location) {
                      alert(`地点已设置: ${location}`);
                    }
                  }}
                  className="flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors font-medium"
                >
                  <MapPin size={14} />
                  <span>设置地点</span>
                </button>
              </div>

              {/* Meta info */}
              <div className="border-t border-[var(--border-color)] pt-3.5 mt-3 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] font-medium">
                  <Clock size={11} />
                  <span>创建于 {formatDate(task.createdAt)}</span>
                </div>
                {task.completedAt && (
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] font-medium">
                    <CheckCircle2 size={11} />
                    <span>完成于 {formatDate(task.completedAt)}</span>
                  </div>
                )}
              </div>

              {/* Delete */}
              <div className="border-t border-[var(--border-color)] pt-3.5">
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-tertiary)] flex-1 font-medium">确认删除？</span>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 text-xs font-medium text-[var(--text-tertiary)] hover:bg-[var(--bg-active)] rounded-xl transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => {
                        deleteTask(task.id);
                        onClose();
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all duration-200 shadow-md shadow-red-500/20"
                    >
                      删除
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2.5 py-2 rounded-xl w-full transition-all duration-200"
                  >
                    <Trash2 size={14} />
                    删除任务
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
