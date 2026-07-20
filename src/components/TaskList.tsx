import { useMemo, useCallback, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Inbox, Plus, MoreHorizontal, GripVertical, CalendarDays, CalendarClock, Filter } from 'lucide-react';
import { useStore } from '../store';
import type { Task, Section } from '../types';
import { showTaskOperationError } from '../utils';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  sections?: Section[];
  projectId?: string;
  viewTitle?: string;
  viewType?: 'inbox' | 'today' | 'upcoming' | 'filter' | 'project';
  showSections?: boolean;
}

function SortableTaskItem({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskItem
        task={task}
        isDragging={isDragging}
        dragHandleProps={listeners as any}
      />
    </div>
  );
}

function SectionGroup({
  section,
  tasks,
  projectId,
  onAddSection,
}: {
  section: Section | null;
  tasks: Task[];
  projectId?: string;
  onAddSection?: () => void;
}) {
  const { addTask, updateSection, deleteSection } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(section?.name || '');
  const [showMenu, setShowMenu] = useState(false);

  const sectionTasks = useMemo(
    () => tasks.filter((t) => (section ? t.sectionId === section.id : true)),
    [tasks, section]
  );

  const taskIds = useMemo(() => sectionTasks.map((t) => t.id), [sectionTasks]);

  const handleAddTask = useCallback(async () => {
    try {
      await addTask({
      title: '新任务',
      description: '',
      projectId: projectId || null,
      sectionId: section ? section.id : null,
      parentId: null,
      priority: 4,
      labels: [],
      dueDate: null,
      isRecurring: false,
      recurrenceRule: null,
      isCompleted: false,
      pomodoroCount: 0,
      plannedPomodoros: 0,
      completedPomodoros: 0,
      estimatedMinutes: 0,
      completedAt: null,
      order: 0,
      });
    } catch (error) {
      showTaskOperationError(error);
    }
  }, [section, projectId, addTask]);

  const handleSaveName = useCallback(() => {
    if (section && editName.trim() && editName !== section.name) {
      updateSection(section.id, { name: editName.trim() });
    }
    setIsEditing(false);
  }, [section, editName, updateSection]);

  return (
    <div className="mb-4">
      {/* Section Header */}
      {section && (
        <div className="group/section flex items-center gap-2.5 px-4 py-3">
          <GripVertical size={14} className="text-gray-300 cursor-grab opacity-0 group-hover/section:opacity-100 transition-opacity duration-200" />
          {isEditing ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') {
                  setEditName(section.name);
                  setIsEditing(false);
                }
              }}
              className="text-sm font-bold text-[var(--text-primary)] bg-transparent border-b-2 border-[var(--accent)] focus:outline-none px-1 py-0.5"
            />
          ) : (
            <span
              className="text-sm font-bold text-[var(--text-primary)] cursor-pointer hover:text-gray-900 transition-colors"
              onClick={() => setIsEditing(true)}
            >
              {section.name}
            </span>
          )}
          <span className="text-xs font-semibold text-[var(--text-tertiary)] bg-[var(--bg-active)] px-2 py-0.5 rounded-full">
            {sectionTasks.length}
          </span>
          <div className="relative ml-auto opacity-0 group-hover/section:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-all duration-200"
            >
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--bg-card)] rounded-xl shadow-xl border border-[var(--border-color)] z-50 py-1.5">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  重命名版块
                </button>
                <button
                  onClick={() => {
                    if (confirm('确定删除此版块？')) {
                      deleteSection(section.id);
                    }
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  删除版块
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section divider line */}
      {section && (
        <div className="mx-4 mb-2">
          <div className="border-t border-[var(--border-light)]" />
        </div>
      )}

      {/* Tasks */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="px-2.5">
          {sectionTasks.map((task) => (
            <SortableTaskItem key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>

      {/* Add Task Button */}
      <button
        onClick={handleAddTask}
        className="flex items-center gap-2.5 px-5 py-2.5 mx-2.5 mt-1.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-xl transition-all duration-200 w-[calc(100%-20px)]"
      >
        <Plus size={16} strokeWidth={2.5} />
        <span>添加任务</span>
      </button>

      {/* Add Section Button (between sections) */}
      {onAddSection && !section && (
        <div className="flex justify-center py-4">
          <button
            onClick={onAddSection}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-active)] rounded-xl transition-all duration-200 border border-dashed border-[var(--border-color)] hover:border-gray-300"
          >
            <Plus size={14} />
            <span>添加版块</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function TaskList({
  tasks,
  sections = [],
  projectId,
  viewTitle,
  viewType,
  showSections = true,
}: TaskListProps) {
  const { reorderTasks, addSection, activeTimerTaskId } = useStore();
  const [showCompleted, setShowCompleted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const currentIds = tasks.map((t) => t.id);
      const oldIndex = currentIds.indexOf(active.id as string);
      const newIndex = currentIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const newOrder = [...currentIds];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, active.id as string);
      reorderTasks(newOrder);
    },
    [tasks, reorderTasks]
  );

  const incompleteTasks = useMemo(() => {
    const tasksFiltered = tasks.filter((t) => !t.isCompleted);
    // Move the active timer task to the top
    if (activeTimerTaskId) {
      const timerTask = tasksFiltered.find((t) => t.id === activeTimerTaskId);
      if (timerTask) {
        return [timerTask, ...tasksFiltered.filter((t) => t.id !== activeTimerTaskId)];
      }
    }
    return tasksFiltered;
  }, [tasks, activeTimerTaskId]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.isCompleted), [tasks]);

  const sectionsToShow = useMemo(() => {
    if (!showSections || sections.length === 0) return [null];
    return sections;
  }, [showSections, sections]);

  const handleAddSection = useCallback(() => {
    if (!projectId) return;
    const name = prompt('输入版块名称：');
    if (name?.trim()) {
      addSection({
        projectId,
        name: name.trim(),
        order: sections.length,
      });
    }
  }, [projectId, addSection, sections.length]);

  if (tasks.length === 0) {
    const emptyConfig = {
      inbox: {
        icon: Inbox,
        gradient: 'from-blue-50 to-cyan-50',
        iconGradient: 'from-blue-100 to-cyan-100',
        iconColor: 'text-blue-300',
        title: '收件箱空空如也',
        desc: '所有未分配项目的任务都会出现在这里',
      },
      today: {
        icon: CalendarDays,
        gradient: 'from-emerald-50 to-teal-50',
        iconGradient: 'from-emerald-100 to-teal-100',
        iconColor: 'text-emerald-300',
        title: '今天没有待办',
        desc: '享受这宁静的一天吧，明天再规划',
      },
      upcoming: {
        icon: CalendarClock,
        gradient: 'from-purple-50 to-pink-50',
        iconGradient: 'from-purple-100 to-pink-100',
        iconColor: 'text-purple-300',
        title: '未来7天很轻松',
        desc: '没有即将到来的任务，享受当下吧',
      },
      filter: {
        icon: Filter,
        gradient: 'from-orange-50 to-amber-50',
        iconGradient: 'from-orange-100 to-amber-100',
        iconColor: 'text-orange-300',
        title: '没有匹配的任务',
        desc: '尝试调整你的筛选条件',
      },
      project: {
        icon: Inbox,
        gradient: 'from-blue-50 to-purple-50',
        iconGradient: 'from-blue-100 to-purple-100',
        iconColor: 'text-blue-300',
        title: '暂无任务',
        desc: '点击「添加任务」开始吧',
      },
    };
    const config = emptyConfig[viewType || 'project'];

    return (
      <div className="flex flex-col items-center justify-center py-28 text-[var(--text-tertiary)]">
        <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-6 shadow-inner`}>
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${config.iconGradient} flex items-center justify-center`}>
            <config.icon size={32} className={config.iconColor} />
          </div>
        </div>
        <p className="text-lg font-bold text-[var(--text-primary)] mb-1.5">{config.title}</p>
        <p className="text-sm text-[var(--text-tertiary)]">{config.desc}</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="py-2">
        {/* View Title */}
        {viewTitle && (
          <div className="px-4 mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{viewTitle}</h2>
              {viewType && (
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  viewType === 'inbox' ? 'bg-blue-500/10 text-blue-600' :
                  viewType === 'today' ? 'bg-emerald-500/10 text-emerald-600' :
                  viewType === 'upcoming' ? 'bg-purple-500/10 text-purple-600' :
                  viewType === 'filter' ? 'bg-orange-500/10 text-orange-600' :
                  'bg-gray-500/10 text-gray-600'
                }`}>
                  {viewType === 'inbox' ? '未分类' :
                   viewType === 'today' ? '今日' :
                   viewType === 'upcoming' ? '未来7天' :
                   viewType === 'filter' ? '已筛选' : ''}
                </span>
              )}
            </div>
            <div className="mt-2 h-0.5 w-12 bg-gradient-to-r from-[var(--accent)] to-transparent rounded-full" />
          </div>
        )}

        {/* Sections */}
        {sectionsToShow.map((section, index) => (
          <div key={section?.id || '__no_section__'}>
            <SectionGroup
              section={section}
              tasks={incompleteTasks}
              projectId={projectId}
              onAddSection={
                index === sectionsToShow.length - 1 ? handleAddSection : undefined
              }
            />
          </div>
        ))}

        {/* Add Section button when no sections exist */}
        {showSections && sections.length === 0 && projectId && (
          <div className="flex justify-center py-4">
            <button
              onClick={handleAddSection}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-active)] rounded-xl transition-all duration-200 border border-dashed border-[var(--border-color)] hover:border-gray-300"
            >
              <Plus size={14} />
              <span>添加版块</span>
            </button>
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div className="mt-8 px-4">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-3 py-2.5 border-t border-[var(--border-light)] w-full text-left"
            >
              <span className={`text-sm transition-transform duration-200 ${showCompleted ? 'rotate-90' : ''}`}>▶</span>
              <span className="text-sm font-bold text-[var(--text-tertiary)] uppercase tracking-wide">
                已完成 ({completedTasks.length})
              </span>
            </button>
            {showCompleted && (
              <div className="space-y-0.5 opacity-60">
                {completedTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DndContext>
  );
}
