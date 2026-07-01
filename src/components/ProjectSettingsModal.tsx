import { useState, useCallback } from 'react';
import { X, Timer, Coffee, RotateCcw } from 'lucide-react';
import { useStore } from '../store';
import PomodoroToggle from './PomodoroToggle';

interface ProjectSettingsModalProps {
  projectId: string;
  onClose: () => void;
}

export default function ProjectSettingsModal({ projectId, onClose }: ProjectSettingsModalProps) {
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));
  const updateProject = useStore((s) => s.updateProject);
  const pomodoroSettings = useStore((s) => s.pomodoroSettings);
  const updatePomodoroSettings = useStore((s) => s.updatePomodoroSettings);

  const [focusMinutes, setFocusMinutes] = useState(pomodoroSettings.focusMinutes);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(pomodoroSettings.shortBreakMinutes);
  const [longBreakMinutes, setLongBreakMinutes] = useState(pomodoroSettings.longBreakMinutes);

  const handleTogglePomodoro = useCallback((enabled: boolean) => {
    updateProject(projectId, { usePomodoro: enabled });
  }, [projectId, updateProject]);

  const handleSave = useCallback(() => {
    updatePomodoroSettings({
      focusMinutes,
      shortBreakMinutes,
      longBreakMinutes,
    });
    onClose();
  }, [focusMinutes, shortBreakMinutes, longBreakMinutes, updatePomodoroSettings, onClose]);

  if (!project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-[420px] max-w-[90vw] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#DC4C3E] to-[#E85D4F] flex items-center justify-center">
              <span className="text-white text-lg">🍅</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">项目设置</h3>
              <p className="text-xs text-[var(--text-tertiary)]">{project.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-active)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Pomodoro Toggle Section */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-hover)]">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                project.usePomodoro
                  ? 'bg-gradient-to-br from-[#DC4C3E] to-[#E85D4F]'
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}>
                <Timer size={16} className="text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">使用番茄钟</span>
                <p className="text-xs text-[var(--text-tertiary)]">为此项目启用专注计时</p>
              </div>
            </div>
            <PomodoroToggle
              enabled={project.usePomodoro}
              onChange={handleTogglePomodoro}
              size="md"
            />
          </div>

          {/* Duration Settings */}
          <div className="space-y-4">
            {/* Focus Duration */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Timer size={14} className="text-[#DC4C3E]" />
                  <label className="text-sm font-medium text-[var(--text-secondary)]">专注时长</label>
                </div>
                <span className="text-sm font-mono font-bold text-[#DC4C3E] bg-[#DC4C3E]/10 px-2 py-0.5 rounded-md">
                  {focusMinutes} 分钟
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={60}
                step={5}
                value={focusMinutes}
                onChange={(e) => setFocusMinutes(Number(e.target.value))}
                className="w-full h-2 bg-[var(--bg-active)] rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#DC4C3E] [&::-webkit-slider-thumb]:shadow-md
                  [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:hover:scale-110"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mt-1 px-0.5">
                <span>15分钟</span>
                <span>60分钟</span>
              </div>
            </div>

            {/* Short Break Duration */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Coffee size={14} className="text-[#22C55E]" />
                  <label className="text-sm font-medium text-[var(--text-secondary)]">短休息时长</label>
                </div>
                <span className="text-sm font-mono font-bold text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded-md">
                  {shortBreakMinutes} 分钟
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={15}
                step={1}
                value={shortBreakMinutes}
                onChange={(e) => setShortBreakMinutes(Number(e.target.value))}
                className="w-full h-2 bg-[var(--bg-active)] rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#22C55E] [&::-webkit-slider-thumb]:shadow-md
                  [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:hover:scale-110"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mt-1 px-0.5">
                <span>3分钟</span>
                <span>15分钟</span>
              </div>
            </div>

            {/* Long Break Duration */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <RotateCcw size={14} className="text-[#3B82F6]" />
                  <label className="text-sm font-medium text-[var(--text-secondary)]">长休息时长</label>
                </div>
                <span className="text-sm font-mono font-bold text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 rounded-md">
                  {longBreakMinutes} 分钟
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={30}
                step={5}
                value={longBreakMinutes}
                onChange={(e) => setLongBreakMinutes(Number(e.target.value))}
                className="w-full h-2 bg-[var(--bg-active)] rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3B82F6] [&::-webkit-slider-thumb]:shadow-md
                  [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:hover:scale-110"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mt-1 px-0.5">
                <span>10分钟</span>
                <span>30分钟</span>
              </div>
            </div>
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
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#DC4C3E] to-[#E85D4F] hover:from-[#c4403a] hover:to-[#D4504A] rounded-lg shadow-md shadow-[#DC4C3E]/20 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
