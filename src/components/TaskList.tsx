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
import { Inbox, Plus, MoreHorizontal, GripVertical } from 'lucide-react';
import { useStore } from '../store';
import type { Task, Section } from '../types';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  sections?: Section[];
  projectId?: string;
  viewTitle?: string;
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

  const handleAddTask = useCallback(() => {
    addTask({
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
  showSections = true,
}: TaskListProps) {
  const { reorderTasks, addSection, activeTimerTaskId } = useStore();

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
    return (
      <div className="flex flex-col items-center justify-center py-28 text-[var(--text-tertiary)]">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center mb-6 shadow-inner">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            <Inbox size={32} className="text-blue-300" />
          </div>
        </div>
        <p className="text-lg font-bold text-[var(--text-primary)] mb-1.5">暂无任务</p>
        <p className="text-sm text-[var(--text-tertiary)]">点击「添加任务」开始吧</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="py-2">
        {/* View Title */}
        {viewTitle && (
          <div className="px-4 mb-4">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{viewTitle}</h2>
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
            <div className="flex items-center gap-3 py-2.5 border-t border-[var(--border-light)]">
              <span className="text-sm font-bold text-[var(--text-tertiary)] uppercase tracking-wide">
                已完成 ({completedTasks.length})
              </span>
            </div>
            <div className="space-y-0.5 opacity-60">
              {completedTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}
