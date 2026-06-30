import { useEffect } from 'react';
import { Pause, CheckCircle } from 'lucide-react';
import { useStore } from '../store';

const MODE_GRADIENTS = {
  focus: 'from-[#DC4C3E] to-[#B83A2E]',
  shortBreak: 'from-[#22C55E] to-[#16A34A]',
  longBreak: 'from-[#3B82F6] to-[#2563EB]',
} as const;

const MODE_LABELS = {
  focus: '专注中',
  shortBreak: '短休息',
  longBreak: '长休息',
} as const;

export default function PomodoroBar() {
  const timerSeconds = useStore((s) => s.timerSeconds);
  const timerStatus = useStore((s) => s.timerStatus);
  const timerMode = useStore((s) => s.timerMode);
  const activeTimerTaskId = useStore((s) => s.activeTimerTaskId);
  const tasks = useStore((s) => s.tasks);
  const pomodoroSettings = useStore((s) => s.pomodoroSettings);
  const pauseTimer = useStore((s) => s.pauseTimer);
  const resumeTimer = useStore((s) => s.resumeTimer);
  const completePomodoro = useStore((s) => s.completePomodoro);
  const tick = useStore((s) => s.tick);

  useEffect(() => {
    if (timerStatus !== 'running') return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timerStatus, tick]);

  const isActive = timerStatus === 'running' || timerStatus === 'paused';
  if (!isActive) return null;

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
  const progress = totalSeconds > 0 ? ((totalSeconds - timerSeconds) / totalSeconds) * 100 : 0;
  const isRunning = timerStatus === 'running';
  const gradient = MODE_GRADIENTS[timerMode];

  return (
    <div className={`relative overflow-hidden bg-gradient-to-r ${gradient} text-white`}>
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-lg ${isRunning ? 'animate-pulse' : ''}`}>🍅</span>
          <span className="text-sm font-medium text-white/90">{MODE_LABELS[timerMode]}</span>
          {currentTaskName && (
            <>
              <span className="text-white/50">·</span>
              <span className="text-sm text-white/80 truncate max-w-[200px]">{currentTaskName}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-lg font-bold tracking-wider">{display}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => (isRunning ? pauseTimer() : resumeTimer())}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors duration-200"
              title={isRunning ? '暂停' : '继续'}
            >
              <Pause size={14} />
            </button>
            <button
              onClick={completePomodoro}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors duration-200"
              title="完成"
            >
              <CheckCircle size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="h-1 bg-black/10">
        <div
          className="h-full bg-white/60 transition-all duration-300 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
