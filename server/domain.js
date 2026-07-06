const { v4: uuidv4 } = require('uuid');
const { queryAll, queryOne, run, transaction } = require('./db');
const { mapTask, mapNotification } = require('./utils');

const BUILT_IN_FILTERS = [
  {
    id: 'builtin-focus',
    name: 'Focus queue',
    description: 'High priority work that is not done and not just a date bucket.',
    query: 'status:open priority<=2',
    sort_order: 0,
  },
  {
    id: 'builtin-needs-triage',
    name: 'Needs triage',
    description: 'Inbox tasks that still need a project, label, or date decision.',
    query: 'status:open project:none label:none due:none',
    sort_order: 1,
  },
  {
    id: 'builtin-stale',
    name: 'Stale open tasks',
    description: 'Open tasks that have not changed for 14 days.',
    query: 'status:open updated_before:14d',
    sort_order: 2,
  },
];

function ensureBuiltInFilters(userId) {
  for (const filter of BUILT_IN_FILTERS) {
    const id = `${filter.id}:${userId}`;
    run(
      'INSERT OR IGNORE INTO filters (id, user_id, name, description, query, is_builtin, sort_order) VALUES (?, ?, ?, ?, ?, 1, ?)',
      [id, userId, filter.name, filter.description, filter.query, filter.sort_order]
    );
  }
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateOnly(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function matchesFilter(task, query) {
  const today = dateOnly(new Date().toISOString());
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((token) => {
    if (token === 'status:open') return !task.isCompleted;
    if (token === 'status:done' || token === 'status:completed') return task.isCompleted;
    if (token === 'project:none') return !task.projectId;
    if (token === 'label:none') return !task.labels || task.labels.length === 0;
    if (token === 'due:none') return !task.dueDate;
    if (token === 'due:today') return task.dueDate === today;
    if (token === 'overdue') return !!task.dueDate && task.dueDate < today && !task.isCompleted;

    const priorityLe = token.match(/^priority<=(\d)$/);
    if (priorityLe) return task.priority <= Number(priorityLe[1]);

    const priorityEq = token.match(/^priority:(\d)$/);
    if (priorityEq) return task.priority === Number(priorityEq[1]);

    const label = token.match(/^label:(.+)$/);
    if (label) return (task.labels || []).some((l) => l.toLowerCase() === label[1]);

    const stale = token.match(/^updated_before:(\d+)d$/);
    if (stale) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - Number(stale[1]));
      return task.updatedAt && new Date(task.updatedAt) < cutoff;
    }

    return task.title.toLowerCase().includes(token) || task.description.toLowerCase().includes(token);
  });
}

function getFilteredTasks(userId, query) {
  return queryAll('SELECT * FROM tasks WHERE user_id = ? ORDER BY sort_order', [userId])
    .map(mapTask)
    .filter((task) => matchesFilter(task, query));
}

function logActivity(userId, type, entityType, entityId, message) {
  run(
    'INSERT INTO activity_logs (id, user_id, type, entity_type, entity_id, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), userId, type, entityType, entityId, message, new Date().toISOString()]
  );
}

function upsertNotification(userId, taskId, type, severity, title, message) {
  const id = `${userId}:${taskId}:${type}`;
  run(
    `INSERT INTO notifications (id, user_id, task_id, type, severity, title, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, task_id, type) DO UPDATE SET
       severity = excluded.severity,
       title = excluded.title,
       message = excluded.message,
       created_at = excluded.created_at`,
    [id, userId, taskId, type, severity, title, message, new Date().toISOString()]
  );
}

function refreshNotifications(userId) {
  const tasks = queryAll('SELECT * FROM tasks WHERE user_id = ?', [userId]).map(mapTask);
  const today = dateOnly(new Date().toISOString());

  transaction(() => {
    for (const task of tasks) {
      if (task.isCompleted) continue;
      if (task.dueDate && task.dueDate < today) {
        upsertNotification(userId, task.id, 'overdue', 'critical', task.title, `Overdue since ${task.dueDate}`);
      } else if (task.dueDate === today) {
        upsertNotification(userId, task.id, 'due_today', 'warning', task.title, 'Due today');
      }
      if (task.priority <= 2) {
        upsertNotification(userId, task.id, 'high_priority', 'warning', task.title, 'High priority task is still open');
      }
      if (!task.projectId && (!task.labels || task.labels.length === 0) && !task.dueDate) {
        upsertNotification(userId, task.id, 'inbox_triage', 'info', task.title, 'Needs project, label, or due date');
      }
    }

    run(
      `DELETE FROM notifications
       WHERE user_id = ? AND task_id IN (SELECT id FROM tasks WHERE user_id = ? AND is_completed = 1)`,
      [userId, userId]
    );
  });

  return queryAll('SELECT * FROM notifications WHERE user_id = ? ORDER BY read_at IS NOT NULL, created_at DESC LIMIT 50', [userId])
    .map(mapNotification);
}

function getStatsSnapshot(userId) {
  const today = dateOnly(new Date().toISOString());
  const nextWeek = new Date(startOfToday());
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = dateOnly(nextWeek.toISOString());

  return {
    loggedAt: new Date().toISOString(),
    openTasks: queryOne('SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND is_completed = 0', [userId]).c,
    completedTasks: queryOne('SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND is_completed = 1', [userId]).c,
    overdueTasks: queryOne('SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND is_completed = 0 AND due_date IS NOT NULL AND due_date < ?', [userId, today]).c,
    dueTodayTasks: queryOne('SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND is_completed = 0 AND due_date = ?', [userId, today]).c,
    upcomingTasks: queryOne('SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND is_completed = 0 AND due_date > ? AND due_date <= ?', [userId, today, nextWeekStr]).c,
    inboxTasks: queryOne('SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND is_completed = 0 AND project_id IS NULL', [userId]).c,
    unlabeledTasks: queryOne(`SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND is_completed = 0 AND (labels IS NULL OR labels = '[]')`, [userId]).c,
    highPriorityTasks: queryOne('SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND is_completed = 0 AND priority <= 2', [userId]).c,
  };
}

module.exports = {
  ensureBuiltInFilters,
  getFilteredTasks,
  logActivity,
  refreshNotifications,
  getStatsSnapshot,
};
