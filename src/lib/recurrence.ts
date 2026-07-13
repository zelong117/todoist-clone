/**
 * 循环待办规则解析工具
 * 
 * 支持的规则格式:
 * - "daily" - 每天
 * - "weekly" - 每周（周一）
 * - "weekly:6" - 每周六 (0=周日, 1=周一, ..., 6=周六)
 * - "weekly:1,3,5" - 每周一三五
 * - "biweekly" - 每两周
 * - "monthly" - 每月
 * - "monthly:15" - 每月15号
 * - "yearly" - 每年
 * - "custom:3:d" - 每3天
 * - "custom:2:w" - 每2周
 */

export type RecurrenceType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';

export interface RecurrenceRule {
  type: RecurrenceType;
  daysOfWeek?: number[]; // 0=周日, 1-6=周一到周六
  dayOfMonth?: number; // 1-31
  interval?: number; // 自定义间隔
  unit?: 'd' | 'w' | 'm' | 'y'; // 天/周/月/年
}

/**
 * 解析循环规则字符串
 */
export function parseRecurrenceRule(rule: string | null): RecurrenceRule | null {
  if (!rule) return null;

  const parts = rule.split(':');
  const type = parts[0] as RecurrenceType;

  switch (type) {
    case 'daily':
      return { type: 'daily' };
    case 'weekly':
      if (parts[1]) {
        const days = parts[1].split(',').map(Number);
        return { type: 'weekly', daysOfWeek: days };
      }
      return { type: 'weekly', daysOfWeek: [1] }; // 默认周一
    case 'biweekly':
      return { type: 'biweekly' };
    case 'monthly':
      return { type: 'monthly', dayOfMonth: parts[1] ? parseInt(parts[1]) : 1 };
    case 'yearly':
      return { type: 'yearly' };
    case 'custom':
      if (parts[1] && parts[2]) {
        return {
          type: 'custom',
          interval: parseInt(parts[1]),
          unit: parts[2] as 'd' | 'w' | 'm' | 'y',
        };
      }
      return null;
    default:
      return null;
  }
}

/**
 * 计算下一次到期日期
 * @param rule 循环规则
 * @param completedDate 完成日期
 * @param currentDate 当前到期日期（可选）
 */
export function getNextDueDate(
  rule: RecurrenceRule,
  completedDate: Date,
  currentDate?: Date | null
): Date | null {
  const base = currentDate ? new Date(currentDate) : new Date(completedDate);

  switch (rule.type) {
    case 'daily': {
      const next = new Date(base);
      next.setDate(next.getDate() + 1);
      return next;
    }

    case 'weekly': {
      if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) {
        const next = new Date(base);
        next.setDate(next.getDate() + 7);
        return next;
      }
      // 找下一个匹配的星期几
      const sorted = [...rule.daysOfWeek].sort((a, b) => a - b);
      const currentDay = base.getDay();
      for (const day of sorted) {
        if (day > currentDay) {
          const next = new Date(base);
          next.setDate(next.getDate() + (day - currentDay));
          return next;
        }
      }
      // 本周已过所有指定日，跳到下周第一个
      const next = new Date(base);
      const firstDay = sorted[0];
      const daysToAdd = 7 - currentDay + firstDay;
      next.setDate(next.getDate() + daysToAdd);
      return next;
    }

    case 'biweekly': {
      const next = new Date(base);
      next.setDate(next.getDate() + 14);
      return next;
    }

    case 'monthly': {
      const next = new Date(base);
      next.setMonth(next.getMonth() + 1);
      if (rule.dayOfMonth) {
        const dim = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(rule.dayOfMonth, dim));
      }
      return next;
    }

    case 'yearly': {
      const next = new Date(base);
      next.setFullYear(next.getFullYear() + 1);
      return next;
    }

    case 'custom': {
      if (!rule.interval || !rule.unit) return null;
      const next = new Date(base);
      switch (rule.unit) {
        case 'd':
          next.setDate(next.getDate() + rule.interval);
          break;
        case 'w':
          next.setDate(next.getDate() + rule.interval * 7);
          break;
        case 'm':
          next.setMonth(next.getMonth() + rule.interval);
          break;
        case 'y':
          next.setFullYear(next.getFullYear() + rule.interval);
          break;
      }
      return next;
    }

    default:
      return null;
  }
}

/**
 * 生成循环规则的显示文字
 */
export function formatRecurrenceRule(rule: string | null): string {
  if (!rule) return '';
  const parsed = parseRecurrenceRule(rule);
  if (!parsed) return '';

  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  switch (parsed.type) {
    case 'daily':
      return '🔁 每天';
    case 'weekly':
      if (parsed.daysOfWeek && parsed.daysOfWeek.length > 0) {
        if (parsed.daysOfWeek.length === 1) {
          return `🔁 每周${dayNames[parsed.daysOfWeek[0]]}`;
        }
        return `🔁 每周${parsed.daysOfWeek.map((d) => dayNames[d]).join('、')}`;
      }
      return '🔁 每周';
    case 'biweekly':
      return '🔁 每两周';
    case 'monthly':
      if (parsed.dayOfMonth) {
        return `🔁 每月${parsed.dayOfMonth}号`;
      }
      return '🔁 每月';
    case 'yearly':
      return '🔁 每年';
    case 'custom': {
      const unitMap: Record<string, string> = { d: '天', w: '周', m: '月', y: '年' };
      return `🔁 每${parsed.interval}${unitMap[parsed.unit || 'd']}`;
    }
    default:
      return '';
  }
}

/**
 * 预定义循环规则选项（供UI选择）
 */
export const RECURRENCE_OPTIONS: { label: string; value: string; icon: string }[] = [
  { label: '每天', value: 'daily', icon: '📅' },
  { label: '每周一', value: 'weekly:1', icon: '📅' },
  { label: '每周二', value: 'weekly:2', icon: '📅' },
  { label: '每周三', value: 'weekly:3', icon: '📅' },
  { label: '每周四', value: 'weekly:4', icon: '📅' },
  { label: '每周五', value: 'weekly:5', icon: '📅' },
  { label: '每周六', value: 'weekly:6', icon: '📅' },
  { label: '每周日', value: 'weekly:0', icon: '📅' },
  { label: '工作日(一二三四五)', value: 'weekly:1,2,3,4,5', icon: '💼' },
  { label: '每两周', value: 'biweekly', icon: '📅' },
  { label: '每月', value: 'monthly', icon: '📅' },
  { label: '每月15号', value: 'monthly:15', icon: '📅' },
  { label: '每年', value: 'yearly', icon: '🎂' },
  { label: '每3天', value: 'custom:3:d', icon: '🔄' },
  { label: '每2周', value: 'custom:2:w', icon: '🔄' },
];
