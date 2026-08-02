// Pick only allowed fields from an object (prevents mass assignment)
function pick(obj, allowedFields) {
  const result = {};
  for (const key of allowedFields) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Map DB row (snake_case) to API response (camelCase)
function mapTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    sectionId: row.section_id,
    parentId: row.parent_id,
    title: row.title,
    description: row.description || '',
    isCompleted: !!row.is_completed,
    completedAt: row.completed_at,
    priority: row.priority,
    dueDate: row.due_date,
    reminderAt: row.reminder_at || null,
    location: row.location || null,
    labels: parseJsonArray(row.labels),
    plannedPomodoros: row.planned_pomodoros || 0,
    completedPomodoros: row.completed_pomodoros || 0,
    pomodoroCount: row.pomodoro_count || 0,
    estimatedMinutes: row.estimated_minutes || 25,
    sortOrder: row.sort_order || 0,
    isRecurring: !!row.is_recurring,
    recurrenceRule: row.recurrence_rule || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProject(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
    isFavorite: !!row.is_favorite,
    usePomodoro: !!row.use_pomodoro,
    sortOrder: row.sort_order || 0,
    createdAt: row.created_at,
  };
}

function mapLabel(row) {
  if (!row) return null;
  return { id: row.id, userId: row.user_id, name: row.name, color: row.color };
}

function mapComment(row) {
  if (!row) return null;
  return { id: row.id, taskId: row.task_id, userId: row.user_id, content: row.content, createdAt: row.created_at };
}

function mapSession(row) {
  if (!row) return null;
  return {
    id: row.id, taskId: row.task_id, userId: row.user_id,
    mode: row.mode, startedAt: row.started_at, endedAt: row.ended_at,
    durationMinutes: row.duration_minutes, completed: !!row.completed,
  };
}

function mapFilter(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description || '',
    query: row.query,
    order: row.sort_order || 0,
    isBuiltIn: !!row.is_builtin,
    createdAt: row.created_at,
  };
}

function mapNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    type: row.type,
    severity: row.severity || 'info',
    title: row.title,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

function mapActivityLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    message: row.message,
    createdAt: row.created_at,
  };
}
module.exports = { pick, mapTask, mapProject, mapLabel, mapComment, mapSession, mapFilter, mapNotification, mapActivityLog };

