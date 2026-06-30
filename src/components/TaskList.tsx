import { useMemo, useCallback } from 'react';
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
import { Inbox, Plus } from 'lucide-react';
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
}: {
  section: Section | null;
  tasks: Task[];
  projectId?: string;
}) {
  const { addTask } = useStore();
  const sectionTasks = useMemo(
    () => tasks.filter((t) => (section ? t.sectionId === section.id : !t.sectionId)),
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
      completedAt: null,
      order: 0,
    });
  }, [section, projectId, addTask]);

  if (sectionTasks.length === 0 && section) return null;

  return (
    <div className="mb-4">
      {section && (
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
          <h3 className="text-sm font-semibold text-gray-600">{section.name}</h3>
          <span className="text-xs text-gray-400">({sectionTasks.length})</span>
        </div>
      )}

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {sectionTasks.map((task) => (
            <SortableTaskItem key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>

      <button
        onClick={handleAddTask}
        className="flex items-center gap-2 px-3 py-2 mt-1 text-sm text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors w-full"
      >
        <Plus size={16} />
        <span>添加任务</span>
      </button>
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
  const { reorderTasks } = useStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      // Reorder: move active before over
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

  const incompleteTasks = useMemo(() => tasks.filter((t) => !t.isCompleted), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.isCompleted), [tasks]);

  const sectionsToShow = useMemo(() => {
    if (!showSections || sections.length === 0) return [null];
    return sections;
  }, [showSections, sections]);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Inbox size={48} className="mb-4 text-gray-300" />
        <p className="text-lg font-medium mb-1">暂无任务</p>
        <p className="text-sm">点击「添加任务」开始吧</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="py-2">
        {viewTitle && (
          <h2 className="text-xl font-bold text-gray-800 px-3 mb-4">{viewTitle}</h2>
        )}

        {sectionsToShow.map((section) => (
          <SectionGroup
            key={section?.id || '__no_section__'}
            section={section}
            tasks={incompleteTasks}
            projectId={projectId}
          />
        ))}

        {/* Show flat list + add button only when there are actual sections (not the null sentinel) */}
        {showSections && sections.length > 0 && (
          <button
            onClick={() => {
              const { addTask } = useStore.getState();
              addTask({
                title: '新任务',
                description: '',
                projectId: projectId || null,
                sectionId: null,
                parentId: null,
                priority: 4,
                labels: [],
                dueDate: null,
                isRecurring: false,
                recurrenceRule: null,
                isCompleted: false,
                completedAt: null,
                order: incompleteTasks.length,
              });
            }}
            className="flex items-center gap-2 px-3 py-2 mt-1 text-sm text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors w-full"
          >
            <Plus size={16} />
            <span>添加任务</span>
          </button>
        )}

        {completedTasks.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-sm font-medium text-gray-400">
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
