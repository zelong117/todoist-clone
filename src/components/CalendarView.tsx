import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import type { Task } from '../types';

const PRIORITY_COLORS: Record<number, string> = {
  1: '#DC4C3E',
  2: '#F59E0B',
  3: '#3B82F6',
  4: '#6B7280',
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

interface CalendarViewProps {
  tasks: Task[];
  projectId?: string;
}

export default function CalendarView({ tasks }: CalendarViewProps) {
  const { setSelectedTaskId } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const firstDayOfWeek = useMemo(() => new Date(year, month, 1).getDay(), [year, month]);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const calendarDays = useMemo(() => {
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    const prevMonthDays = firstDayOfWeek;
    const prevMonth = new Date(year, month, 0);
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const d = prevMonth.getDate() - i;
      const dateStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: dateStr, day: d, isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: dateStr, day: d, isCurrentMonth: true });
    }

    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = new Date(year, month + 1, d);
      const dateStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: dateStr, day: d, isCurrentMonth: false });
    }

    return days;
  }, [year, month, daysInMonth, firstDayOfWeek]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      if (task.dueDate) {
        if (!map[task.dueDate]) map[task.dueDate] = [];
        map[task.dueDate].push(task);
      }
    });
    return map;
  }, [tasks]);

  const handlePrevMonth = useCallback(() => {
    setCurrentDate(new Date(year, month - 1, 1));
  }, [year, month]);

  const handleNextMonth = useCallback(() => {
    setCurrentDate(new Date(year, month + 1, 1));
  }, [year, month]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const monthLabel = `${year}年${month + 1}月`;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{monthLabel}</h2>
          <button
            onClick={handleToday}
            className="px-2 py-1 text-xs text-[#DC4C3E] hover:bg-red-50 rounded transition-colors"
          >
            今天
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px mb-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-[var(--text-tertiary)] py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px flex-1 bg-[var(--bg-active)] rounded-xl overflow-hidden">
        {calendarDays.map(({ date, day, isCurrentMonth }) => {
          const dayTasks = tasksByDate[date] || [];
          const isToday = date === today;

          return (
            <div
              key={date}
              className={`bg-[var(--bg-card)] min-h-[80px] p-1.5 cursor-pointer transition-colors ${
                !isCurrentMonth ? 'bg-[var(--bg-hover)]' : ''
              } hover:bg-[var(--bg-hover)]`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-[#DC4C3E] text-white'
                      : isCurrentMonth
                      ? 'text-[var(--text-secondary)]'
                      : 'text-gray-300'
                  }`}
                >
                  {day}
                </span>
              </div>

              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTaskId(task.id);
                    }}
                    className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] truncate hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: PRIORITY_COLORS[task.priority] + '20',
                      color: PRIORITY_COLORS[task.priority],
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                    />
                    <span className="truncate">{task.title}</span>
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-[9px] text-[var(--text-tertiary)] px-1">
                    +{dayTasks.length - 3}个
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
