import { useState, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import { useStore } from '../store';
import PomodoroToggle from './PomodoroToggle';

const PROJECT_COLORS = [
  '#DC4C3E', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
];

interface NewProjectModalProps {
  onClose: () => void;
}

export default function NewProjectModal({ onClose }: NewProjectModalProps) {
  const { addProject, projects } = useStore();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [usePomodoro, setUsePomodoro] = useState(false);

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;
    addProject({
      name: name.trim(),
      color,
      order: projects.length,
      isFavorite: false,
      usePomodoro,
    });
    onClose();
  }, [name, color, usePomodoro, addProject, projects.length, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--bg-card)] dark:bg-gray-800 rounded-2xl shadow-2xl w-[380px] max-w-[90vw] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#DC4C3E] to-[#E85D4F] flex items-center justify-center">
              <Plus size={16} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">新建项目</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-active)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              项目名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入项目名称..."
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[#DC4C3E]/40 focus:border-[#DC4C3E] transition-all"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              项目颜色
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all duration-200 ${
                    color === c
                      ? 'ring-2 ring-offset-2 ring-[var(--text-primary)] scale-110'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Pomodoro Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-hover)]">
            <div className="flex items-center gap-3">
              <span className="text-lg">🍅</span>
              <div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">使用番茄钟</span>
                <p className="text-xs text-[var(--text-tertiary)]">为此项目启用专注计时</p>
              </div>
            </div>
            <PomodoroToggle
              enabled={usePomodoro}
              onChange={setUsePomodoro}
              size="md"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--border-color)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-active)] rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#DC4C3E] to-[#E85D4F] hover:from-[#c4403a] hover:to-[#D4504A] rounded-lg shadow-md shadow-[#DC4C3E]/20 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            创建项目
          </button>
        </div>
      </div>
    </div>
  );
}
