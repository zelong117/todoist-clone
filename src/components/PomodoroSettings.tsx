import { X } from 'lucide-react';
import { useStore } from '../store';
import PomodoroToggle from './PomodoroToggle';

interface PomodoroSettingsProps {
  onClose: () => void;
}

export default function PomodoroSettings({ onClose }: PomodoroSettingsProps) {
  const settings = useStore((s) => s.pomodoroSettings);
  const updatePomodoroSettings = useStore((s) => s.updatePomodoroSettings);

  return (
    <div className="bg-[var(--bg-card)] dark:bg-gray-800 rounded-xl shadow-xl w-80 p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-white">番茄钟设置</h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-active)] dark:hover:bg-gray-700 transition-colors duration-200"
        >
          <X size={16} />
        </button>
      </div>

      {/* Focus duration */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-[var(--text-secondary)] dark:text-gray-300">专注时长</label>
          <span className="text-sm font-mono text-[#DC4C3E] font-semibold">
            {settings.focusMinutes} 分钟
          </span>
        </div>
        <input
          type="range"
          min={15}
          max={60}
          step={5}
          value={settings.focusMinutes}
          onChange={(e) => updatePomodoroSettings({ focusMinutes: Number(e.target.value) })}
          className="w-full h-2 bg-[var(--bg-active)] dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-[#DC4C3E]"
        />
        <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-0.5">
          <span>15</span>
          <span>60</span>
        </div>
      </div>

      {/* Short break duration */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-[var(--text-secondary)] dark:text-gray-300">短休息时长</label>
          <span className="text-sm font-mono text-[#22C55E] font-semibold">
            {settings.shortBreakMinutes} 分钟
          </span>
        </div>
        <input
          type="range"
          min={3}
          max={15}
          step={1}
          value={settings.shortBreakMinutes}
          onChange={(e) => updatePomodoroSettings({ shortBreakMinutes: Number(e.target.value) })}
          className="w-full h-2 bg-[var(--bg-active)] dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-[#22C55E]"
        />
        <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-0.5">
          <span>3</span>
          <span>15</span>
        </div>
      </div>

      {/* Long break duration */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-[var(--text-secondary)] dark:text-gray-300">长休息时长</label>
          <span className="text-sm font-mono text-[#3B82F6] font-semibold">
            {settings.longBreakMinutes} 分钟
          </span>
        </div>
        <input
          type="range"
          min={10}
          max={30}
          step={5}
          value={settings.longBreakMinutes}
          onChange={(e) => updatePomodoroSettings({ longBreakMinutes: Number(e.target.value) })}
          className="w-full h-2 bg-[var(--bg-active)] dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-[#3B82F6]"
        />
        <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-0.5">
          <span>10</span>
          <span>30</span>
        </div>
      </div>

      <div className="border-t border-[var(--border-color)] dark:border-gray-700 mb-4" />

      {/* Auto-start toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)] dark:text-gray-300">自动开始休息</span>
          <PomodoroToggle
            enabled={settings.autoStartBreak}
            onChange={(v) => updatePomodoroSettings({ autoStartBreak: v })}
            size="sm"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)] dark:text-gray-300">自动开始专注</span>
          <PomodoroToggle
            enabled={settings.autoStartPomodoro}
            onChange={(v) => updatePomodoroSettings({ autoStartPomodoro: v })}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}
