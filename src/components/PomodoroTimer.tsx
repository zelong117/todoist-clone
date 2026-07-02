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
  const progress = totalSeconds > 0 ? (totalSeconds - timerSeconds) / totalSeconds : 0;
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
      <div className="flex flex-col items-center gap-1.5">
        <button
          onClick={() => setExpanded(true)}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#DC4C3E] to-[#E85D4A] hover:from-[#C53727] hover:to-[#D45040] text-white flex items-center justify-center text-xl shadow-lg shadow-red-500/25 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-red-500/30"
          title="番茄钟"
        >
          🍅
        </button>
        {completedPomodoros > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-card)]/10 text-[11px] font-bold text-[var(--text-tertiary)]">
            <span>🍅</span>
            {completedPomodoros}
          </div>
        )}
      </div>
    );
  }

  if (!expanded && isActive) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <button
          onClick={() => setExpanded(true)}
          className="relative w-14 h-14 flex items-center justify-center"
          title={`${MODE_LABELS[timerMode]} ${display}`}
        >
          <svg width="56" height="56" className="transform -rotate-90">
            <circle cx="28" cy="28" r={22} fill="none" stroke="#d1d5db" strokeWidth="3.5" />
            <circle
              cx="28"
              cy="28"
              r={22}
              fill="none"
              stroke={strokeColor}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 22}
              strokeDashoffset={2 * Math.PI * 22 * (1 - progress)}
              className="transition-all duration-300"
            />
          </svg>
          <span className="absolute text-[9px] font-mono font-bold text-[var(--text-primary)]">
            {display}
          </span>
        </button>
        {completedPomodoros > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-card)]/10 text-[11px] font-bold text-[var(--text-tertiary)]">
            <span>🍅</span>
            {completedPomodoros}
          </div>
        )}
      </div>
    );
  }

  const statusText = isRunning ? MODE_LABELS[timerMode] : isPaused ? '已暂停' : '准备开始';

  return (
    <div className="rounded-2xl shadow-xl p-5 w-[240px] transition-all duration-300 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a]">
      {/* Header with collapse and mode selector */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setExpanded(false)}
          className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200"
        >
          <ChevronUp size={16} />
        </button>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/10 rounded-xl p-0.5">
          {(['focus', 'shortBreak', 'longBreak'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                if (timerMode === mode) return;
                useStore.getState().stopTimer();
                useStore.getState().startTimer('__manual__');
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 ${
                timerMode === mode
                  ? 'bg-[var(--accent)] text-white shadow-md shadow-red-500/20'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {mode === 'focus' ? '🍅' : mode === 'shortBreak' ? '☕' : '🌴'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center mb-4 relative">
        <svg width="192" height="192" className="transform -rotate-90">
          <circle cx="96" cy="96" r={84} fill="none" stroke="#d1d5db" strokeWidth="7" opacity="0.3" />
          <circle
            cx="96"
            cy="96"
            r={84}
            fill="none"
            stroke={strokeColor}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 84}
            strokeDashoffset={2 * Math.PI * 84 * (1 - progress)}
            className="transition-all duration-500"
            style={{ filter: `drop-shadow(0 0 12px ${strokeColor}60)` }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center w-[192px] h-[192px]">
          <span className="text-4xl font-mono font-black text-gray-900 dark:text-white tracking-tight">
            {display}
          </span>
          <span className="text-xs mt-1.5 font-bold" style={{ color: strokeColor }}>
            {statusText}
          </span>
        </div>
      </div>

      {currentTaskName && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center truncate mb-2.5 px-1 font-medium">
          {currentTaskName}
        </p>
      )}

      <div className="flex items-center justify-center gap-2.5 mt-3">
        <button
          onClick={handleToggle}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110 shadow-lg"
          style={{ backgroundColor: strokeColor, boxShadow: `0 4px 14px ${strokeColor}40` }}
          title={isRunning ? '暂停' : '继续'}
        >
          {isRunning ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={handleSkip}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition-all duration-200"
          title="跳过"
        >
          <SkipForward size={14} />
        </button>
        <button
          onClick={stopTimer}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition-all duration-200"
          title="停止"
        >
          <Square size={14} />
        </button>
      </div>
      {/* Completed Pomodoros */}
      <div className="mt-4 pt-3.5 border-t border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">今日完成</span>
          <span className="text-[11px] text-gray-700 dark:text-gray-200 font-black">{completedPomodoros}/{pomodoroSettings.longBreakInterval}</span>
        </div>
        {/* Tomato icons */}
        <div className="flex items-center gap-1.5 mb-2.5">
          {Array.from({ length: pomodoroSettings.longBreakInterval }).map((_, i) => (
            <span 
              key={i} 
              className={`text-base transition-all duration-300 ${i < completedPomodoros ? 'opacity-100 scale-110' : 'opacity-20 grayscale'}`}
            >
              🍅
            </span>
          ))}
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#DC4C3E] to-[#F59E0B] rounded-full transition-all duration-500"
            style={{ width: `${Math.min((completedPomodoros / pomodoroSettings.longBreakInterval) * 100, 100)}%` }}
          />
        </div>
      </div>
      {/* Completed Toast */}
      {showCompleted && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-gradient-to-r from-[#DC4C3E] to-[#E85D4A] text-white text-xs font-bold rounded-xl shadow-xl animate-bounce whitespace-nowrap">
          🍅 番茄完成！
        </div>
      )}
    </div>
  );
}
