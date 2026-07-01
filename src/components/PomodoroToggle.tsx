import { useState } from 'react';

interface PomodoroToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function PomodoroToggle({ enabled, onChange, size = 'md' }: PomodoroToggleProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const dimensions = {
    sm: { track: 'w-9 h-5', dot: 'w-3.5 h-3.5', translate: 'translate-x-4' },
    md: { track: 'w-11 h-6', dot: 'w-4.5 h-4.5', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-7', dot: 'w-5.5 h-5.5', translate: 'translate-x-7' },
  }[size];

  const tooltip = enabled
    ? '番茄钟已开启 - 任务将显示计时器'
    : '番茄钟已关闭 - 任务不显示计时器';

  return (
    <div className="relative inline-flex items-center">
      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
        className={`
          relative inline-flex items-center rounded-full
          transition-all duration-300 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-[#DC4C3E]/40 focus:ring-offset-2
          hover:scale-105 active:scale-95
          ${dimensions.track}
          ${enabled
            ? 'bg-gradient-to-r from-[#DC4C3E] to-[#E85D4F] shadow-lg shadow-[#DC4C3E]/25'
            : 'bg-gray-200 dark:bg-gray-600'
          }
        `}
      >
        {/* White dot */}
        <span
          className={`
            absolute top-0.5 left-0.5
            ${dimensions.dot}
            bg-white rounded-full shadow-md
            transition-all duration-300 ease-[cubic-bezier(0.68,-0.55,0.27,1.55)]
            ${enabled ? dimensions.translate : 'translate-x-0'}
          `}
        >
          {/* Inner highlight for depth */}
          <span className="absolute inset-0.5 rounded-full bg-gradient-to-br from-white/60 to-transparent" />
        </span>
      </button>

      {/* Tooltip */}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2 bottom-full mb-2
          px-3 py-1.5 rounded-lg
          bg-gray-800 text-white text-xs font-medium whitespace-nowrap
          pointer-events-none
          transition-all duration-200 ease-out
          ${tooltipVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}
        `}
      >
        {tooltip}
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45 -mt-1" />
      </div>
    </div>
  );
}
