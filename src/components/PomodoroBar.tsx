import { Pause, CheckCircle } from 'lucide-react';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';
type TimerStatus = 'idle' | 'running' | 'paused';

const MODE_GRADIENTS: Record<TimerMode, string> = {
  focus: 'from-[#DC4C3E] to-[#B83A2E]',
  shortBreak: 'from-[#22C55E] to-[#16A34A]',
  longBreak: 'from-[#3B82F6] to-[#2563EB]',
};

const MODE_LABELS: Record<TimerMode, string> = {
  focus: '专注中',
  shortBreak: '短休息',
  longBreak: '长休息',
};

export default function PomodoroBar() {
  // Mock store values — replace with real store when available
  const timerSeconds = 0;
  const timerTotalSeconds = 25 * 60;
  const timerStatus: TimerStatus = 'idle' as TimerStatus;
  const timerMode: TimerMode = 'focus';
  const currentTaskName: string | null = null;

  const isActive = timerStatus === 'running' || timerStatus === 'paused';
  if (!isActive) return null;

  const remaining = timerTotalSeconds - timerSeconds;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progress = timerTotalSeconds > 0 ? (timerSeconds / timerTotalSeconds) * 100 : 0;
  const isRunning = timerStatus === 'running';
  const gradient = MODE_GRADIENTS[timerMode];

  return (
    <div className={`relative overflow-hidden bg-gradient-to-r ${gradient} text-white`}>
      {/* Main content */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-lg ${isRunning ? 'animate-pulse' : ''}`}>
            🍅
          </span>
          <span className="text-sm font-medium text-white/90">
            {MODE_LABELS[timerMode]}
          </span>
          {currentTaskName && (
            <>
              <span className="text-white/50">·</span>
              <span className="text-sm text-white/80 truncate max-w-[200px]">
                {currentTaskName}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-lg font-bold tracking-wider">
            {display}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {/* store.toggleTimer() */}}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors duration-200"
              title={isRunning ? '暂停' : '继续'}
            >
              <Pause size={14} />
            </button>
            <button
              onClick={() => {/* store.completeTimer() */}}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors duration-200"
              title="完成"
            >
              <CheckCircle size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-black/10">
        <div
          className="h-full bg-white/60 transition-all duration-300 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
