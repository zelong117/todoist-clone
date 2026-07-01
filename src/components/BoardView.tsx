import { useMemo, useCallback, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import type { Task, Section } from '../types';

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

interface BoardViewProps {
  tasks: Task[];
  sections: Section[];
}

function TaskCard({ task, isDragging }: { task: Task; isDragging?: boolean }) {
  const { setSelectedTaskId, toggleComplete, deleteTask } = useStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = useMemo(() => {
    if (!task.dueDate || task.isCompleted) return false;
    return task.dueDate < new Date().toISOString().split('T')[0];
  }, [task.dueDate, task.isCompleted]);

  const isToday = useMemo(() => {
    if (!task.dueDate) return false;
    return task.dueDate === new Date().toISOString().split('T')[0];
  }, [task.dueDate]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) return '今天';
    if (date.getTime() === tomorrow.getTime()) return '明天';

    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setSelectedTaskId(task.id)}
      className={`relative bg-[var(--bg-card)] rounded-xl p-3.5 cursor-pointer transition-all duration-200 group ${
        isDragging || isSortableDragging
          ? 'opacity-60 shadow-2xl ring-2 ring-[#DC4C3E]/20 scale-[1.03] rotate-[1deg]'
          : 'shadow-sm hover:shadow-md border border-[var(--border-light)]/80'
      }`}
    >
      {/* Left priority bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
        style={{
          backgroundColor: PRIORITY_COLORS[task.priority],
          boxShadow: `0 0 6px ${PRIORITY_COLORS[task.priority]}30`,
        }}
      />

      {/* Delete button - hover to show */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteTask(task.id);
        }}
        className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 text-[var(--text-tertiary)] hover:text-red-500 transition-all duration-150"
      >
        <Trash2 size={13} />
      </button>

      {/* Header with checkbox and title */}
      <div className="flex items-start gap-2.5 mb-2 pl-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleComplete(task.id);
          }}
          className="mt-0.5 flex-shrink-0"
        >
          <div
            className={`w-[18px] h-[18px] rounded-[5px] border-2 transition-all duration-200 flex items-center justify-center ${
              task.isCompleted ? 'border-transparent shadow-sm' : 'border-gray-300 hover:border-gray-400'
            }`}
            style={{
              borderColor: task.isCompleted ? 'transparent' : undefined,
              backgroundColor: task.isCompleted ? PRIORITY_COLORS[task.priority] : 'transparent',
              backgroundImage: task.isCompleted
                ? `linear-gradient(135deg, ${PRIORITY_COLORS[task.priority]}, ${PRIORITY_COLORS[task.priority]}dd)`
                : 'none',
            }}
          >
            {task.isCompleted && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>
        <span
          className={`text-sm leading-5 flex-1 font-medium transition-all duration-200 ${
            task.isCompleted ? 'line-through text-[var(--text-tertiary)] opacity-60' : 'text-[var(--text-primary)]'
          }`}
        >
          {task.title}
        </span>
      </div>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5 pl-2">
          {task.labels.map((label) => (
            <span
              key={label}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-[var(--bg-active)] text-[var(--text-secondary)] border border-[var(--border-color)]/50"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Footer: date + priority */}
      <div className="flex items-center justify-between pl-2">
        {task.dueDate ? (
          <span
            className={`flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
              isOverdue
                ? 'text-red-600 bg-red-50'
                : isToday
                ? 'text-green-600 bg-green-50'
                : 'text-[var(--text-tertiary)] bg-[var(--bg-hover)]'
            }`}
          >
            <Calendar size={10} />
            {formatDate(task.dueDate)}
          </span>
        ) : (
          <div />
        )}
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white shadow-sm"
          style={{
            backgroundColor: PRIORITY_COLORS[task.priority],
            boxShadow: `0 1px 3px ${PRIORITY_COLORS[task.priority]}25`,
          }}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>
      </div>
    </div>
  );
}

function BoardColumn({ section, tasks }: { section: Section; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: section.id });
  const { addTask } = useStore();

  const columnTasks = useMemo(
    () => tasks.filter((t) => t.sectionId === section.id),
    [tasks, section.id]
  );

  const handleAddTask = useCallback(() => {
    addTask({
      title: '新任务',
      description: '',
      sectionId: section.id,
      projectId: section.projectId,
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
      order: columnTasks.length,
    });
  }, [section, addTask, columnTasks.length]);

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[300px] rounded-2xl flex flex-col max-h-full transition-all duration-200 ${
        isOver
          ? 'bg-[var(--bg-active)]/80 ring-2 ring-[#DC4C3E]/20 shadow-inner'
          : 'bg-[var(--bg-hover)]/60'
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">{section.name}</h3>
          <span className="text-[11px] font-medium text-[var(--text-tertiary)] bg-[var(--bg-card)]/80 px-2 py-0.5 rounded-full shadow-sm border border-[var(--border-light)]">
            {columnTasks.length}
          </span>
        </div>
        <button
          onClick={handleAddTask}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-card)]/80 text-[var(--text-tertiary)] hover:text-[#DC4C3E] transition-all duration-150"
          title="添加任务"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2.5">
        <SortableContext
          items={columnTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {columnTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {/* Empty state */}
        {columnTasks.length === 0 && (
          <div className="border-2 border-dashed border-[var(--border-color)] rounded-xl py-8 flex flex-col items-center justify-center text-gray-300">
            <p className="text-xs font-medium">暂无任务</p>
            <p className="text-[10px] mt-1">拖拽任务到此处</p>
          </div>
        )}

        {/* Add task button */}
        <button
          onClick={handleAddTask}
          className="w-full py-2 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--text-tertiary)] hover:text-[var(--text-tertiary)] hover:border-gray-300 hover:bg-[var(--bg-card)]/50 transition-all duration-200 flex items-center justify-center gap-1.5 text-xs font-medium"
        >
          <Plus size={14} />
          添加任务
        </button>
      </div>
    </div>
  );
}

export default function BoardView({ tasks, sections }: BoardViewProps) {
  const { updateTask } = useStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id);
      if (task) setActiveTask(task);
    },
    [tasks]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;

      const activeTaskItem = tasks.find((t) => t.id === active.id);
      if (!activeTaskItem) return;

      // Check if dropped on a column (section)
      const overSection = sections.find((s) => s.id === over.id);
      if (overSection && activeTaskItem.sectionId !== overSection.id) {
        updateTask(activeTaskItem.id, { sectionId: overSection.id });
      }
    },
    [tasks, sections, updateTask]
  );

  const sectionsToShow = useMemo(() => {
    if (sections.length === 0) {
      return [{ id: '__default__', name: '待办', projectId: '', order: 0 }] as Section[];
    }
    return sections;
  }, [sections]);

  const tasksToShow = useMemo(() => {
    if (sections.length === 0) {
      // Non-project view: map ALL tasks to __default__ section
      return tasks.map((t) => ({
        ...t,
        sectionId: '__default__',
      }));
    }
    return tasks;
  }, [tasks, sections]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-5 h-full overflow-x-auto pb-4 px-1">
        {sectionsToShow.map((section) => (
          <BoardColumn key={section.id} section={section} tasks={tasksToShow} />
        ))}

        {/* Add column button */}
        <button
          onClick={() => {
            const name = prompt('输入版块名称：');
            if (name?.trim()) {
              useStore.getState().addSection({
                projectId: sections[0]?.projectId || '',
                name: name.trim(),
                order: sections.length,
              });
            }
          }}
          className="flex-shrink-0 w-[300px] h-12 rounded-2xl border-2 border-dashed border-[var(--border-color)] dark:border-gray-600 flex items-center justify-center text-[var(--text-tertiary)] dark:text-[var(--text-tertiary)] hover:text-[var(--text-tertiary)] hover:border-gray-300 hover:bg-[var(--bg-card)]/50 transition-all duration-200"
        >
          <Plus size={18} className="mr-1.5" />
          <span className="text-sm font-medium">添加列</span>
        </button>
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
