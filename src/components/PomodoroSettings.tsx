import { X } from 'lucide-react';

interface PomodoroSettingsProps {
  onClose: () => void;
}

export default function PomodoroSettings({ onClose }: PomodoroSettingsProps) {
  // Mock settings state — replace with real store when available
  const focusDuration = 25;
  const shortBreakDuration = 5;
  const longBreakDuration = 15;
  const autoStartBreak = true;
  const autoStartFocus = false;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-80 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          番茄钟设置
        </h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
        >
          <X size={16} />
        </button>
      </div>

      {/* Focus duration */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            专注时长
          </label>
          <span className="text-sm font-mono text-[#DC4C3E] font-semibold">
            {focusDuration} 分钟
          </span>
        </div>
        <input
          type="range"
          min={15}
          max={60}
          step={5}
          value={focusDuration}
          onChange={() => {/* store.updateSettings */}}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-[#DC4C3E]"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>15</span>
          <span>60</span>
        </div>
      </div>

      {/* Short break duration */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            短休息时长
          </label>
          <span className="text-sm font-mono text-[#22C55E] font-semibold">
            {shortBreakDuration} 分钟
          </span>
        </div>
        <input
          type="range"
          min={3}
          max={15}
          step={1}
          value={shortBreakDuration}
          onChange={() => {/* store.updateSettings */}}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-[#22C55E]"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>3</span>
          <span>15</span>
        </div>
      </div>

      {/* Long break duration */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            长休息时长
          </label>
          <span className="text-sm font-mono text-[#3B82F6] font-semibold">
            {longBreakDuration} 分钟
          </span>
        </div>
        <input
          type="range"
          min={10}
          max={30}
          step={5}
          value={longBreakDuration}
          onChange={() => {/* store.updateSettings */}}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-[#3B82F6]"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>10</span>
          <span>30</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700 mb-4" />

      {/* Auto-start toggles */}
      <div className="space-y-3">
        {/* Auto-start break */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            自动开始休息
          </span>
          <button
            onClick={() => {/* store.toggleAutoBreak() */}}
            className={`relative w-10 h-6 rounded-full transition-colors duration-300 ${
              autoStartBreak ? 'bg-[#DC4C3E]' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                autoStartBreak ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Auto-start focus */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            自动开始专注
          </span>
          <button
            onClick={() => {/* store.toggleAutoFocus() */}}
            className={`relative w-10 h-6 rounded-full transition-colors duration-300 ${
              autoStartFocus ? 'bg-[#DC4C3E]' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                autoStartFocus ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
