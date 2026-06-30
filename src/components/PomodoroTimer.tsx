import { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, Square, ChevronUp } from 'lucide-react';
import { useStore } from '../store';

const MODE_COLORS = {
  focus: '#DC4C3E',
  shortBreak: '#22C55E',
  longBreak: '#3B82F6',
} as const;

const MODE_LABELS = {
  focus: '专注中',
  shortBreak: '短休息',
  longBreak: '长休息',
} as const;

export default function PomodoroTimer() {
  const timerSeconds = useStore((s) => s.timerSeconds);
  const timerStatus = useStore((s) => s.timerStatus);
  const timerMode = useStore((s) => s.timerMode);
  const activeTimerTaskId = useStore((s) => s.activeTimerTaskId);
  const tasks = useStore((s) => s.tasks);
  const pomodoroSettings = useStore((s) => s.pomodoroSettings);
  const pauseTimer = useStore((s) => s.pauseTimer);
  const resumeTimer = useStore((s) => s.resumeTimer);
  const stopTimer = useStore((s) => s.stopTimer);
  const skipToBreak = useStore((s) => s.skipToBreak);
  const tick = useStore((s) => s.tick);

  const [expanded, setExpanded] = useState(false);

  // Tick every second when running
  useEffect(() => {
    if (timerStatus !== 'running') return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timerStatus, tick]);

  const currentTaskName = activeTimerTaskId
    ? tasks.find((t) => t.id === activeTimerTaskId)?.title ?? null
    : null;

  const totalSeconds =
    timerMode === 'focus'
      ? pomodoroSettings.focusMinutes * 60
      : timerMode === 'shortBreak'
      ? pomodoroSettings.shortBreakMinutes * 60
      : pomodoroSettings.longBreakMinutes * 60;

  const remaining = timerSeconds;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // SVG circle calculations
  const radius = expanded ? 88 : 20;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? (totalSeconds - timerSeconds) / totalSeconds : 0;
  const offset = circumference * (1 - progress);
  const strokeColor = MODE_COLORS[timerMode];

  const isRunning = timerStatus === 'running';
  const isPaused = timerStatus === 'paused';
  const isActive = isRunning || isPaused;

  const handleToggle = () => {
    if (isRunning) pauseTimer();
    else resumeTimer();
  };

  const handleSkip = () => {
    if (timerMode === 'focus') skipToBreak();
    else stopTimer();
  };

  if (!expanded && !isActive) {
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
    return (
      <button
        onClick={() => setExpanded(true)}
        className="relative w-12 h-12 flex items-center justify-center"
        title={`${MODE_LABELS[timerMode]} ${display}`}
      >
        <svg width="48" height="48" className="transform -rotate-90">
          <circle cx="24" cy="24" r={20} fill="none" stroke="#e5e7eb" strokeWidth="3" />
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 w-[200px] transition-all duration-300">
      <button
        onClick={() => setExpanded(false)}
        className="w-full flex items-center justify-end mb-2 text-gray-400 hover:text-gray-600"
      >
        <ChevronUp size={16} />
      </button>

      <div className="flex justify-center mb-3 relative">
        <svg width="176" height="176" className="transform -rotate-90">
          <circle cx="88" cy="88" r={88} fill="none" stroke="#e5e7eb" strokeWidth="6" />
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
          <span className="text-xs mt-1 font-medium" style={{ color: strokeColor }}>
            {MODE_LABELS[timerMode]}
          </span>
        </div>
      </div>

      {currentTaskName && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center truncate mb-2 px-1">
          {currentTaskName}
        </p>
      )}

      <div className="flex items-center justify-center gap-2 mt-2">
        <button
          onClick={handleToggle}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
          style={{ backgroundColor: strokeColor }}
          title={isRunning ? '暂停' : '继续'}
        >
          {isRunning ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={handleSkip}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
          title="跳过"
        >
          <SkipForward size={14} />
        </button>
        <button
          onClick={stopTimer}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
          title="停止"
        >
          <Square size={14} />
        </button>
      </div>
    </div>
  );
}
