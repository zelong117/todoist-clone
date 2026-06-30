import { useState, useMemo, useCallback } from 'react';
import {
  Edit3,
  Plus,
  List,
  Columns3,
  CalendarDays,
} from 'lucide-react';
import { useStore } from '../store';
// types imported via store
import TaskList from './TaskList';
import BoardView from './BoardView';
import CalendarView from './CalendarView';

interface ProjectViewProps {
  projectId: string;
}

type ViewType = 'list' | 'board' | 'calendar';

export default function ProjectView({ projectId }: ProjectViewProps) {
  const { projects, tasks, sections, updateProject, addSection } = useStore();
  const project = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  const [viewType, setViewType] = useState<ViewType>('list');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === projectId),
    [tasks, projectId]
  );

  const projectSections = useMemo(
    () => sections.filter((s) => s.projectId === projectId),
    [sections, projectId]
  );

  const handleTitleEdit = useCallback(() => {
    if (!project) return;
    setEditingTitle(true);
    setTitleValue(project.name);
  }, [project]);

  const handleTitleSave = useCallback(() => {
    if (!project || !titleValue.trim()) {
      setEditingTitle(false);
      return;
    }
    updateProject(project.id, { name: titleValue.trim() });
    setEditingTitle(false);
  }, [project, titleValue, updateProject]);

  const handleAddSection = useCallback(() => {
    const name = prompt('输入 Section 名称：');
    if (name?.trim() && projectId) {
      addSection({
        name: name.trim(),
        projectId,
        order: projectSections.length,
      });
    }
  }, [projectId, projectSections.length, addSection]);

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        项目不存在
      </div>
    );
  }

  const viewButtons: { type: ViewType; icon: typeof List; label: string }[] = [
    { type: 'list', icon: List, label: '列表' },
    { type: 'board', icon: Columns3, label: '看板' },
    { type: 'calendar', icon: CalendarDays, label: '日历' },
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            {editingTitle ? (
              <input
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
                autoFocus
                className="text-xl font-bold text-gray-800 border-b-2 border-[#DC4C3E] outline-none bg-transparent"
              />
            ) : (
              <h1
                className="text-xl font-bold text-gray-800 cursor-pointer hover:text-[#DC4C3E] transition-colors flex items-center gap-2 group"
                onClick={handleTitleEdit}
              >
                {project.name}
                <Edit3
                  size={14}
                  className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </h1>
            )}
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            {viewButtons.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                  viewType === type
                    ? 'bg-white text-gray-800 shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {viewType === 'list' && (
          <div>
            <TaskList
              tasks={projectTasks}
              sections={projectSections}
              projectId={projectId}
              showSections={projectSections.length > 0}
            />
            <button
              onClick={handleAddSection}
              className="flex items-center gap-2 px-3 py-2 mt-4 text-sm text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus size={16} />
              添加 Section
            </button>
          </div>
        )}

        {viewType === 'board' && (
          <BoardView tasks={projectTasks} sections={projectSections} />
        )}

        {viewType === 'calendar' && (
          <CalendarView tasks={projectTasks} projectId={projectId} />
        )}
      </div>
    </div>
  );
}
