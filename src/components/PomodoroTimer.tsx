import { useState } from 'react';
import { Play, Pause, SkipForward, Square, ChevronUp } from 'lucide-react';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';
type TimerStatus = 'idle' | 'running' | 'paused';

const MODE_COLORS: Record<TimerMode, string> = {
  focus: '#DC4C3E',
  shortBreak: '#22C55E',
  longBreak: '#3B82F6',
};

const MODE_LABELS: Record<TimerMode, string> = {
  focus: '专注中',
  shortBreak: '短休息',
  longBreak: '长休息',
};

export default function PomodoroTimer() {
  // Mock store values — replace with real store when available
  const timerSeconds = 0;
  const timerTotalSeconds = 25 * 60;
  const timerStatus: TimerStatus = 'idle' as TimerStatus;
  const timerMode: TimerMode = 'focus';
  const currentTaskName: string | null = null;

  const [expanded, setExpanded] = useState(false);

  const remaining = timerTotalSeconds - timerSeconds;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // SVG circle calculations
  const radius = expanded ? 88 : 20;
  const circumference = 2 * Math.PI * radius;
  const progress = timerTotalSeconds > 0 ? timerSeconds / timerTotalSeconds : 0;
  const offset = circumference * (1 - progress);
  const strokeColor = MODE_COLORS[timerMode];

  const isRunning = timerStatus === 'running';
  const isPaused = timerStatus === 'paused';
  const isActive = isRunning || isPaused;

  if (!expanded && !isActive) {
    // Collapsed idle — small tomato button
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-12 h-12 rounded-full bg-[#DC4C3E] hover:bg-[#C53727] text-white flex items-center justify-center text-xl shadow-md transition-all duration-300 hover:scale-110"
        title="番茄钟"
      >
        🍅
      </button>
    );
  }

  if (!expanded && isActive) {
    // Collapsed active — mini progress ring
    return (
      <button
        onClick={() => setExpanded(true)}
        className="relative w-12 h-12 flex items-center justify-center"
        title={`${MODE_LABELS[timerMode]} ${display}`}
      >
        <svg width="48" height="48" className="transform -rotate-90">
          <circle
            cx="24"
            cy="24"
            r={20}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="3"
          />
          <circle
            cx="24"
            cy="24"
            r={20}
            fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-300"
          />
        </svg>
        <span className="absolute text-[8px] font-mono font-bold text-gray-800 dark:text-gray-200">
          {display}
        </span>
      </button>
    );
  }

  // Expanded view
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 w-[200px] transition-all duration-300">
      {/* Collapse button */}
      <button
        onClick={() => setExpanded(false)}
        className="w-full flex items-center justify-end mb-2 text-gray-400 hover:text-gray-600"
      >
        <ChevronUp size={16} />
      </button>

      {/* Progress ring */}
      <div className="flex justify-center mb-3">
        <svg width="176" height="176" className="transform -rotate-90">
          <circle
            cx="88"
            cy="88"
            r={88}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="6"
          />
          <circle
            cx="88"
            cy="88"
            r={88}
            fill="none"
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center w-[176px] h-[176px]">
          <span className="text-3xl font-mono font-bold text-gray-800 dark:text-white">
            {display}
          </span>
          <span
            className="text-xs mt-1 font-medium"
            style={{ color: strokeColor }}
          >
            {MODE_LABELS[timerMode]}
          </span>
        </div>
      </div>

      {/* Current task name */}
      {currentTaskName && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center truncate mb-2 px-1">
          {currentTaskName}
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 mt-2">
        <button
          onClick={() => {/* store.toggleTimer() */}}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
          style={{ backgroundColor: strokeColor }}
          title={isRunning ? '暂停' : '继续'}
        >
          {isRunning ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={() => {/* store.skipTimer() */}}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
          title="跳过"
        >
          <SkipForward size={14} />
        </button>
        <button
          onClick={() => {/* store.stopTimer() */}}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
          title="停止"
        >
          <Square size={14} />
        </button>
      </div>
    </div>
  );
}
