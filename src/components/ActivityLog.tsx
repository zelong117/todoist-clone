import { useMemo } from 'react';
import { CheckCircle2, Activity, Timer } from 'lucide-react';
import { useStore } from '../store';
import { format, parseISO, isToday, isYesterday } from 'date-fns';

export default function ActivityLog() {
  const { tasks, pomodoroSessions } = useStore();

  const completedTasks = useMemo(() => {
    return tasks
      .filter((t) => t.isCompleted && t.completedAt)
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  }, [tasks]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof completedTasks> = {};
    completedTasks.forEach((task) => {
      if (!task.completedAt) return;
      const dateKey = task.completedAt.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(task);
    });
    return groups;
  }, [completedTasks]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
  }, [groupedByDate]);

  const groupedPomodoroSessions = useMemo(() => {
    const groups: Record<string, typeof pomodoroSessions> = {};
    pomodoroSessions.forEach((session) => {
      if (!session.endedAt) return;
      const dateKey = session.endedAt.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(session);
    });
    return groups;
  }, [pomodoroSessions]);

  const sortedPomodoroDates = useMemo(() => {
    return Object.keys(groupedPomodoroSessions).sort((a, b) => b.localeCompare(a));
  }, [groupedPomodoroSessions]);

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (isToday(date)) return '今天';
      if (isYesterday(date)) return '昨天';
      return format(date, 'yyyy年M月d日');
    } catch {
      return dateStr;
    }
  };

  const hasAnyData = completedTasks.length > 0 || pomodoroSessions.length > 0;

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-tertiary)]">
        <Activity size={48} className="mb-4 opacity-30" />
        <p className="text-lg font-medium mb-2">暂无活动记录</p>
        <p className="text-sm">完成任务或使用番茄钟后，活动记录会显示在这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Completed Tasks by Date */}
      {sortedDates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={18} className="text-green-500" />
            <h3 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              任务完成记录
            </h3>
            <span className="text-xs text-[var(--text-tertiary)]">
              共 {completedTasks.length} 个
            </span>
          </div>
          {sortedDates.map((dateKey) => (
            <div key={dateKey} className="mb-5">
              <div className="flex items-center gap-2 mb-2 ml-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {formatDate(dateKey)}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  ({groupedByDate[dateKey].length} 个任务)
                </span>
              </div>
              <div className="space-y-1.5 ml-5">
                {groupedByDate[dateKey].map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] transition-colors"
                  >
                    <CheckCircle2
                      size={14}
                      className="text-green-500 flex-shrink-0"
                    />
                    <span className="text-sm text-[var(--text-secondary)] flex-1">
                      {task.title}
                    </span>
                    {task.completedAt && (
                      <span className="text-xs text-[var(--text-tertiary)] font-mono">
                        {format(parseISO(task.completedAt), 'HH:mm')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pomodoro Sessions */}
      {sortedPomodoroDates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Timer size={18} className="text-[#DC4C3E]" />
            <h3 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              番茄钟记录
            </h3>
            <span className="text-xs text-[var(--text-tertiary)]">
              共 {pomodoroSessions.length} 次
            </span>
          </div>
          {sortedPomodoroDates.map((dateKey) => (
            <div key={dateKey} className="mb-5">
              <div className="flex items-center gap-2 mb-2 ml-1">
                <div className="w-2 h-2 rounded-full bg-[#DC4C3E]" />
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {formatDate(dateKey)}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  ({groupedPomodoroSessions[dateKey].length} 个番茄)
                </span>
              </div>
              <div className="space-y-1.5 ml-5">
                {groupedPomodoroSessions[dateKey].map((session) => {
                  const task = tasks.find((t) => t.id === session.taskId);
                  return (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] transition-colors"
                    >
                      <span className="text-sm flex-shrink-0">🍅</span>
                      <span className="text-sm text-[var(--text-secondary)] flex-1">
                        {task?.title || '未知任务'}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {session.durationMinutes}分钟
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          session.completed
                            ? 'bg-green-50 text-green-600'
                            : 'bg-[var(--bg-active)] text-[var(--text-tertiary)]'
                        }`}
                      >
                        {session.completed ? '完成' : '中断'}
                      </span>
                      {session.endedAt && (
                        <span className="text-xs text-[var(--text-tertiary)] font-mono">
                          {format(parseISO(session.endedAt), 'HH:mm')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
