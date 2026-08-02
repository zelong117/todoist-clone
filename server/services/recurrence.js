function parseRule(rule) {
  if (typeof rule !== 'string' || !rule) return null;
  const [type, detail, unit] = rule.split(':');
  if (type === 'daily' || type === 'biweekly' || type === 'yearly') return { type };
  if (type === 'weekly') {
    const days = (detail || '1').split(',').map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    return days.length ? { type, days } : null;
  }
  if (type === 'monthly') {
    const day = detail ? Number(detail) : 1;
    return Number.isInteger(day) && day >= 1 && day <= 31 ? { type, day } : null;
  }
  if (type === 'custom') {
    const interval = Number(detail);
    return Number.isInteger(interval) && interval >= 1 && interval <= 365 && ['d', 'w', 'm', 'y'].includes(unit)
      ? { type, interval, unit }
      : null;
  }
  return null;
}

function fromDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date();
  return new Date(`${value}T12:00:00`);
}

function toDateOnly(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNextDueDate(ruleText, completedAt = new Date(), currentDueDate = null) {
  const rule = parseRule(ruleText);
  if (!rule) return null;
  const base = currentDueDate ? fromDateOnly(currentDueDate) : new Date(completedAt);
  const next = new Date(base);
  if (rule.type === 'daily') next.setDate(next.getDate() + 1);
  if (rule.type === 'biweekly') next.setDate(next.getDate() + 14);
  if (rule.type === 'yearly') next.setFullYear(next.getFullYear() + 1);
  if (rule.type === 'monthly') {
    next.setMonth(next.getMonth() + 1, 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(rule.day, lastDay));
  }
  if (rule.type === 'weekly') {
    const currentDay = next.getDay();
    const days = [...rule.days].sort((a, b) => a - b);
    const following = days.find((day) => day > currentDay);
    next.setDate(next.getDate() + (following === undefined ? 7 - currentDay + days[0] : following - currentDay));
  }
  if (rule.type === 'custom') {
    if (rule.unit === 'd') next.setDate(next.getDate() + rule.interval);
    if (rule.unit === 'w') next.setDate(next.getDate() + rule.interval * 7);
    if (rule.unit === 'm') next.setMonth(next.getMonth() + rule.interval);
    if (rule.unit === 'y') next.setFullYear(next.getFullYear() + rule.interval);
  }
  return toDateOnly(next);
}

function getNextReminderAt(reminderAt, currentDueDate, nextDueDate) {
  if (!reminderAt || !currentDueDate || !nextDueDate) return null;
  const currentDue = fromDateOnly(currentDueDate);
  const nextDue = fromDateOnly(nextDueDate);
  const reminder = new Date(reminderAt);
  if (Number.isNaN(currentDue.getTime()) || Number.isNaN(nextDue.getTime()) || Number.isNaN(reminder.getTime())) return null;

  const dayOffset = Math.round((nextDue.getTime() - currentDue.getTime()) / 86_400_000);
  reminder.setDate(reminder.getDate() + dayOffset);
  return reminder.toISOString();
}

module.exports = { parseRule, getNextDueDate, getNextReminderAt };
