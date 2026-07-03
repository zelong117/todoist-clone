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
    labels: JSON.parse(row.labels || '[]'),
    plannedPomodoros: row.planned_pomodoros || 0,
    completedPomodoros: row.completed_pomodoros || 0,
    pomodoroCount: row.pomodoro_count || 0,
    estimatedMinutes: row.estimated_minutes || 25,
    sortOrder: row.sort_order || 0,
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

module.exports = { pick, mapTask, mapProject, mapLabel, mapComment, mapSession };
