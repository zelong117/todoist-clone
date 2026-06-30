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
import { Plus, Calendar } from 'lucide-react';
import { useStore } from '../store';
import type { Task, Section } from '../types';

const PRIORITY_COLORS: Record<number, string> = {
  1: '#DC4C3E',
  2: '#F59E0B',
  3: '#3B82F6',
  4: '#6B7280',
};

interface BoardViewProps {
  tasks: Task[];
  sections: Section[];
}

function TaskCard({ task, isDragging }: { task: Task; isDragging?: boolean }) {
  const { setSelectedTaskId, toggleComplete } = useStore();

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setSelectedTaskId(task.id)}
      className={`bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all ${
        isDragging || isSortableDragging ? 'opacity-50 shadow-lg ring-2 ring-[#DC4C3E]/20' : ''
      }`}
    >
      <div className="flex items-start gap-2 mb-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleComplete(task.id);
          }}
          className="mt-0.5 flex-shrink-0"
        >
          <div
            className={`w-4 h-4 rounded border-2 transition-colors ${
              task.isCompleted ? 'border-transparent' : ''
            }`}
            style={{
              borderColor: task.isCompleted ? 'transparent' : PRIORITY_COLORS[task.priority],
              backgroundColor: task.isCompleted ? PRIORITY_COLORS[task.priority] : 'transparent',
            }}
          >
            {task.isCompleted && (
              <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>
        <span
          className={`text-sm leading-5 flex-1 ${
            task.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'
          }`}
        >
          {task.title}
        </span>
      </div>

      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map((label) => (
            <span
              key={label}
              className="px-1.5 py-0.5 text-[10px] rounded-full bg-blue-50 text-blue-600"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        {task.dueDate && (
          <span
            className={`flex items-center gap-1 text-[10px] ${
              isOverdue ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            <Calendar size={10} />
            {task.dueDate}
          </span>
        )}
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white ml-auto"
          style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
        >
          P{task.priority}
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
      completedAt: null,
      order: columnTasks.length,
    });
  }, [section, addTask, columnTasks.length]);

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 bg-gray-50 rounded-xl flex flex-col max-h-full ${
        isOver ? 'ring-2 ring-[#DC4C3E]/30 bg-gray-100' : ''
      } transition-colors`}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200/50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">{section.name}</h3>
          <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">
            {columnTasks.length}
          </span>
        </div>
        <button
          onClick={handleAddTask}
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        <SortableContext
          items={columnTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {columnTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
        {columnTasks.length === 0 && (
          <p className="text-xs text-gray-300 text-center py-8">暂无任务</p>
        )}
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
      return tasks.map((t) => ({
        ...t,
        sectionId: t.sectionId || '__default__',
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
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {sectionsToShow.map((section) => (
          <BoardColumn key={section.id} section={section} tasks={tasksToShow} />
        ))}

        <button className="flex-shrink-0 w-72 h-12 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-500 hover:border-gray-300 transition-colors">
          <Plus size={18} className="mr-1" />
          添加列
        </button>
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
