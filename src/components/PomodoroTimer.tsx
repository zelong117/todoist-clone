import { useState, useEffect, useRef } from 'react';
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
  const completedPomodoros = useStore((s) => s.completedPomodoros);
  const pauseTimer = useStore((s) => s.pauseTimer);
  const resumeTimer = useStore((s) => s.resumeTimer);
  const stopTimer = useStore((s) => s.stopTimer);
  const skipToBreak = useStore((s) => s.skipToBreak);
  const tick = useStore((s) => s.tick);

  const [expanded, setExpanded] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const prevTimerStatus = useRef(timerStatus);

  // Detect running -> idle transition for toast
  useEffect(() => {
    if (prevTimerStatus.current === 'running' && timerStatus === 'idle') {
      setShowCompleted(true);
      const t = setTimeout(() => setShowCompleted(false), 3000);
      prevTimerStatus.current = timerStatus;
      return () => clearTimeout(t);
    }
    prevTimerStatus.current = timerStatus;
  }, [timerStatus]);

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
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => setExpanded(true)}
          className="w-12 h-12 rounded-full bg-[#DC4C3E] hover:bg-[#C53727] text-white flex items-center justify-center text-xl shadow-md transition-all duration-300 hover:scale-110"
          title="番茄钟"
        >
          🍅
        </button>
        {completedPomodoros > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-card)]/10 text-[10px] font-medium text-[var(--text-tertiary)]">
            <span>🍅</span>
            {completedPomodoros}
          </div>
        )}
      </div>
    );
  }

  if (!expanded && isActive) {
    return (
      <div className="flex flex-col items-center gap-1">
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
          <span className="absolute text-[8px] font-mono font-bold text-[var(--text-primary)] dark:text-gray-200">
            {display}
          </span>
        </button>
        {completedPomodoros > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-card)]/10 text-[10px] font-medium text-[var(--text-tertiary)]">
            <span>🍅</span>
            {completedPomodoros}
          </div>
        )}
      </div>
    );
  }

  const statusText = isRunning ? MODE_LABELS[timerMode] : isPaused ? '已暂停' : '准备开始';

  return (
    <div className="bg-[var(--bg-card)] dark:bg-gray-800 rounded-xl shadow-lg p-4 w-[220px] transition-all duration-300">
      {/* Header with collapse and mode selector */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setExpanded(false)}
          className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <ChevronUp size={16} />
        </button>
        <div className="flex items-center gap-1 bg-[var(--bg-active)] dark:bg-gray-700 rounded-lg p-0.5">
          {(['focus', 'shortBreak', 'longBreak'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                if (timerMode === mode) return;
                useStore.getState().stopTimer();
                useStore.getState().startTimer('__manual__');
              }}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                timerMode === mode
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {mode === 'focus' ? '🍅' : mode === 'shortBreak' ? '☕' : '🌴'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center mb-3 relative">
        <svg width="176" height="176" className="transform -rotate-90">
          <circle cx="88" cy="88" r={80} fill="none" stroke="var(--border-light)" strokeWidth="6" opacity="0.3" />
          <circle
            cx="88"
            cy="88"
            r={80}
            fill="none"
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 80}
            strokeDashoffset={2 * Math.PI * 80 * (1 - progress)}
            className="transition-all duration-500"
            style={{ filter: `drop-shadow(0 0 6px ${strokeColor}50)` }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center w-[176px] h-[176px]">
          <span className="text-3xl font-mono font-bold text-[var(--text-primary)] dark:text-white">
            {display}
          </span>
          <span className="text-xs mt-1 font-medium" style={{ color: strokeColor }}>
            {statusText}
          </span>
        </div>
      </div>

      {currentTaskName && (
        <p className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-tertiary)] text-center truncate mb-2 px-1">
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
          className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-active)] dark:bg-gray-700 text-[var(--text-secondary)] dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
          title="跳过"
        >
          <SkipForward size={14} />
        </button>
        <button
          onClick={stopTimer}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-active)] dark:bg-gray-700 text-[var(--text-secondary)] dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
          title="停止"
        >
          <Square size={14} />
        </button>
      </div>
      {/* Completed Pomodoros */}
      <div className="mt-4 pt-3 border-t border-[var(--border-light)] dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-[var(--text-tertiary)] font-medium">今日完成</span>
          <span className="text-[11px] text-[var(--text-secondary)] font-bold">{completedPomodoros}/{pomodoroSettings.longBreakInterval}</span>
        </div>
        {/* Tomato icons */}
        <div className="flex items-center gap-1 mb-2">
          {Array.from({ length: pomodoroSettings.longBreakInterval }).map((_, i) => (
            <span 
              key={i} 
              className={`text-sm transition-all duration-300 ${i < completedPomodoros ? 'opacity-100 scale-110' : 'opacity-20 grayscale'}`}
            >
              🍅
            </span>
          ))}
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-[var(--bg-active)] dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#DC4C3E] to-[#F59E0B] rounded-full transition-all duration-500"
            style={{ width: `${Math.min((completedPomodoros / pomodoroSettings.longBreakInterval) * 100, 100)}%` }}
          />
        </div>
      </div>
      {/* Completed Toast */}
      {showCompleted && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[#DC4C3E] text-white text-xs font-medium rounded-lg shadow-lg animate-bounce whitespace-nowrap">
          🍅 番茄完成！
        </div>
      )}
    </div>
  );
}
