import { v4 as uuidv4 } from 'uuid';
import { format, isToday, isTomorrow, addDays, parseISO, isBefore, startOfDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Task } from './types';

export function generateId(): string {
  return uuidv4();
}

const weekdayMap: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0,
  '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 0, '周天': 0,
  '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6, '星期日': 0, '星期天': 0,
};

/**
 * Parse natural language date expressions (Chinese).
 * Returns an ISO date string (YYYY-MM-DD) or null if not recognized.
 */
export function parseNaturalDate(text: string): string | null {
  const now = new Date();
  const lower = text.trim().toLowerCase();

  // 今天、明天、后天
  if (lower === '今天' || lower === 'today') {
    return format(now, 'yyyy-MM-dd');
  }
  if (lower === '明天' || lower === 'tomorrow') {
    return format(addDays(now, 1), 'yyyy-MM-dd');
  }
  if (lower === '后天') {
    return format(addDays(now, 2), 'yyyy-MM-dd');
  }
  if (lower === '大后天') {
    return format(addDays(now, 3), 'yyyy-MM-dd');
  }

  // 下周X
  const nextWeekMatch = lower.match(/^(下周|下个周|下星期|下个星期)(.)/);
  if (nextWeekMatch) {
    const dayChar = nextWeekMatch[2];
    const targetDay = weekdayMap[dayChar] ?? weekdayMap[`周${dayChar}`] ?? weekdayMap[`星期${dayChar}`];
    if (targetDay !== undefined) {
      const currentDay = now.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      daysUntil += 7; // next week
      return format(addDays(now, daysUntil), 'yyyy-MM-dd');
    }
  }

  // 周X / 星期X (this week)
  const thisWeekMatch = lower.match(/^(周|星期)(.)/);
  if (thisWeekMatch) {
    const dayChar = thisWeekMatch[2];
    const targetDay = weekdayMap[dayChar] ?? weekdayMap[`周${dayChar}`] ?? weekdayMap[`星期${dayChar}`];
    if (targetDay !== undefined) {
      const currentDay = now.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      return format(addDays(now, daysUntil), 'yyyy-MM-dd');
    }
  }

  // X天后
  const daysLaterMatch = lower.match(/^(\d+)天后/);
  if (daysLaterMatch) {
    return format(addDays(now, parseInt(daysLaterMatch[1])), 'yyyy-MM-dd');
  }

  // 每天、每周X、每月X号 — these are recurrence rules, return today as marker
  if (lower === '每天' || lower === '每日' || lower === 'everyday' || lower === 'every day') {
    return format(now, 'yyyy-MM-dd');
  }
  const weeklyMatch = lower.match(/^每(周|星期)(.)/);
  if (weeklyMatch) {
    return format(now, 'yyyy-MM-dd');
  }
  const monthlyMatch = lower.match(/^每月(\d{1,2})[号日]/);
  if (monthlyMatch) {
    return format(now, 'yyyy-MM-dd');
  }

  // Try parsing as ISO date
  try {
    const parsed = parseISO(lower);
    if (!isNaN(parsed.getTime())) {
      return format(parsed, 'yyyy-MM-dd');
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Format an ISO date string for display.
 */
export function formatDate(date: string): string {
  try {
    const d = parseISO(date);
    if (isToday(d)) return '今天';
    if (isTomorrow(d)) return '明天';
    return format(d, 'M月d日', { locale: zhCN });
  } catch {
    return date;
  }
}

/**
 * Check if a task is overdue (past due and not completed).
 */
export function isOverdue(task: Task): boolean {
  if (task.isCompleted || !task.dueDate) return false;
  try {
    const dueDate = startOfDay(parseISO(task.dueDate));
    const today = startOfDay(new Date());
    return isBefore(dueDate, today);
  } catch {
    return false;
  }
}

/**
 * Filter tasks based on a filter expression string.
 * Supported filters:
 *   - priority:N  (e.g., priority:1)
 *   - label:X     (e.g., label:work)
 *   - overdue
 *   - completed / !completed
 *   - project:X
 *   - today
 *   - upcoming
 */
export function filterTasks(tasks: Task[], filter: string): Task[] {
  if (!filter.trim()) return tasks;

  const parts = filter.toLowerCase().split(/\s+/);

  return tasks.filter(task => {
    return parts.every(part => {
      // priority filter
      const priorityMatch = part.match(/^priority:(\d)$/);
      if (priorityMatch) {
        return task.priority === parseInt(priorityMatch[1]);
      }

      // label filter
      const labelMatch = part.match(/^label:(.+)$/);
      if (labelMatch) {
        return task.labels.some(l => l.toLowerCase() === labelMatch[1]);
      }

      // overdue
      if (part === 'overdue') {
        return isOverdue(task);
      }

      // completed / !completed
      if (part === 'completed') return task.isCompleted;
      if (part === '!completed') return !task.isCompleted;

      // project
      const projectMatch = part.match(/^project:(.+)$/);
      if (projectMatch) {
        return task.projectId === projectMatch[1];
      }

      // today
      if (part === 'today') {
        if (!task.dueDate) return false;
        try {
          return isToday(parseISO(task.dueDate));
        } catch {
          return false;
        }
      }

      // upcoming
      if (part === 'upcoming') {
        if (!task.dueDate) return false;
        try {
          const due = parseISO(task.dueDate);
          return !isToday(due) && !isBefore(due, startOfDay(new Date()));
        } catch {
          return false;
        }
      }

      // text search fallback
      return task.title.toLowerCase().includes(part) ||
             task.description.toLowerCase().includes(part);
    });
  });
}

/**
 * Get Tailwind-compatible color class for priority level.
 * Priority 1 = highest (red), 4 = lowest (gray)
 */
export function getPriorityColor(priority: number): string {
  switch (priority) {
    case 1: return 'text-red-500';
    case 2: return 'text-orange-500';
    case 3: return 'text-blue-500';
    case 4: return 'text-gray-400';
    default: return 'text-gray-400';
  }
}

/**
 * Get background color for priority level.
 */
export function getPriorityBgColor(priority: number): string {
  switch (priority) {
    case 1: return 'bg-red-500';
    case 2: return 'bg-orange-500';
    case 3: return 'bg-blue-500';
    case 4: return 'bg-gray-400';
    default: return 'bg-gray-400';
  }
}
