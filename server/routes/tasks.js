/**
 * 浠诲姟璺敱
 * 澶勭悊浠诲姟鐨?CRUD 鎿嶄綔鍜屽畬鎴愮姸鎬佸垏鎹?
 * 
 * 瀹夊叏鎺柦锛?
 * - 鎵€鏈夋煡璇㈤兘閫氳繃 user_id 杩囨护锛岀‘淇濇暟鎹殧绂?
 * - 鍒涘缓/鏇存柊鏃堕獙璇佸叧鑱斿疄浣擄紙椤圭洰銆佺埗浠诲姟锛夊睘浜庡綋鍓嶇敤鎴?
 * - 浣跨敤 Joi 杩涜杈撳叆楠岃瘉
 * - 浣跨敤 pick() 闃叉鎵归噺璧嬪€兼敾鍑?
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run, transaction } = require('../db');
const { pick, mapTask } = require('../utils');
const validate = require('../middleware/validate');
const { createTaskSchema, updateTaskSchema, taskIdParamSchema } = require('../validations/taskSchemas');
const { asyncHandler } = require('../middleware/errorHandler');
const { logActivity, refreshNotifications } = require('../domain');

// Helper: get WebSocket services from app.locals
function getWsServices(req) {
  return {
    wsManager: req.app.locals.wsManager,
    notificationService: req.app.locals.notificationService,
    messageQueue: req.app.locals.messageQueue,
  };
}

/**
 * 楠岃瘉鍏宠仈瀹炰綋鏄惁灞炰簬褰撳墠鐢ㄦ埛
 * @param {string} entityType - 瀹炰綋绫诲瀷锛坧rojects/tasks锛?
 * @param {string} entityId - 瀹炰綋 ID
 * @param {string} userId - 褰撳墠鐢ㄦ埛 ID
 * @returns {boolean} 鏄惁灞炰簬褰撳墠鐢ㄦ埛
 */
function nullableId(value) {
  return value === '' || value === undefined ? null : value;
}

function verifyOwnership(entityType, entityId, userId) {
  if (!entityId) return true; // null/undefined 涓嶉渶瑕侀獙璇?
  const entity = queryOne(`SELECT id FROM ${entityType} WHERE id = ? AND user_id = ?`, [entityId, userId]);
  return !!entity;
}

/**
 * GET /
 * 获取当前用户的所有任务 - 支持 search/page/limit/priority 过滤
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { search, page, limit, priority, projectId, completed } = req.query;

  let sql = 'SELECT * FROM tasks WHERE user_id = ?';
  const params = [req.user.id];

  // 搜索过滤
  if (search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q);
  }

  // 优先级过滤
  if (priority !== undefined && priority !== '') {
    sql += ' AND priority = ?';
    params.push(Number(priority));
  }

  // 项目过滤
  if (projectId !== undefined && projectId !== '') {
    if (projectId === 'null' || projectId === 'none') {
      sql += ' AND project_id IS NULL';
    } else {
      sql += ' AND project_id = ?';
      params.push(projectId);
    }
  }

  // 完成状态过滤
  if (completed !== undefined && completed !== '') {
    if (completed === 'true' || completed === '1') {
      sql += ' AND is_completed = 1';
    } else if (completed === 'false' || completed === '0') {
      sql += ' AND is_completed = 0';
    }
  }

  sql += ' ORDER BY sort_order, created_at DESC';

  // 分页
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 200));
  const offset = (pageNum - 1) * limitNum;

  // 如果请求了分页，返回分页格式
  if (page !== undefined || limit !== undefined) {
    // 先查总数
    let countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    countSql = countSql.replace(' ORDER BY sort_order, created_at DESC', '');
    const countResult = queryOne(countSql, params);
    const total = countResult ? countResult.total : 0;

    sql += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const rows = queryAll(sql, params);
    res.json({
      data: rows.map(mapTask),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } else {
    const rows = queryAll(sql, params);
    res.json(rows.map(mapTask));
  }
}));

/**
 * GET /:id
 * 获取单个任务详情
 */
router.get('/:id', authenticate, validate({ params: taskIdParamSchema }), asyncHandler(async (req, res) => {
  const task = queryOne('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(mapTask(task));
}));

/**
 * POST /
 * 鍒涘缓鏂颁换鍔?- 楠岃瘉鍏宠仈瀹炰綋鎵€鏈夋潈
 */
router.post('/', authenticate, validate({ body: createTaskSchema }), asyncHandler(async (req, res) => {
  const { title, description, projectId, sectionId, parentId, priority, dueDate, labels, plannedPomodoros, isRecurring, recurrenceRule } = req.body;

  // 銆愭暟鎹殧绂汇€戦獙璇?projectId 灞炰簬褰撳墠鐢ㄦ埛
  if (projectId && !verifyOwnership('projects', projectId, req.user.id)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  // 銆愭暟鎹殧绂汇€戦獙璇?parentId 灞炰簬褰撳墠鐢ㄦ埛锛堢埗浠诲姟蹇呴』鏄嚜宸辩殑锛?
  if (parentId && !verifyOwnership('tasks', parentId, req.user.id)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  if (sectionId) {
    const section = queryOne('SELECT id, project_id FROM sections WHERE id = ? AND user_id = ?', [sectionId, req.user.id]);
    if (!section || section.project_id !== projectId) return res.status(400).json({ error: '版块不属于所选项目' });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const pp = plannedPomodoros || 1;
  run('INSERT INTO tasks (id, user_id, project_id, section_id, parent_id, title, description, priority, due_date, labels, planned_pomodoros, estimated_minutes, is_recurring, recurrence_rule, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.id, nullableId(projectId), nullableId(sectionId), nullableId(parentId), title.trim(), description || '', priority || 1, dueDate || null, JSON.stringify(Array.isArray(labels) ? labels : []), pp, pp * 25, isRecurring ? 1 : 0, recurrenceRule || null, now, now]);

  const task = queryOne('SELECT * FROM tasks WHERE id = ?', [id]);
  const mapped = mapTask(task);

  // 馃敂 WebSocket: 骞挎挱浠诲姟鍒涘缓閫氱煡
  const { notificationService, messageQueue, wsManager } = getWsServices(req);
  notificationService.broadcast('task:create', { task: mapped, userId: req.user.id }, wsManager, messageQueue);
  logActivity(req.user.id, 'task_created', 'task', id, 'Created task: ' + mapped.title);
  refreshNotifications(req.user.id);

  res.status(201).json(mapped);
}));

/**
 * PUT /:id
 * 鏇存柊浠诲姟 - 楠岃瘉浠诲姟瀛樺湪鎬с€佹墍鏈夋潈鍜屽叧鑱斿疄浣?
 */
router.put('/:id', authenticate, validate({ params: taskIdParamSchema, body: updateTaskSchema }), asyncHandler(async (req, res) => {
  const task = queryOne('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const allowed = ['title', 'description', 'isCompleted', 'completedAt', 'priority', 'dueDate', 'labels', 'plannedPomodoros', 'completedPomodoros', 'pomodoroCount', 'estimatedMinutes', 'sortOrder', 'projectId', 'sectionId', 'parentId', 'isRecurring', 'recurrenceRule'];
  const sanitized = pick(req.body, allowed);

  // 銆愭暟鎹殧绂汇€戝鏋滄洿鏂颁簡 projectId锛岄獙璇佹柊椤圭洰灞炰簬褰撳墠鐢ㄦ埛
  if (sanitized.projectId !== undefined && sanitized.projectId !== null && sanitized.projectId !== '') {
    if (!verifyOwnership('projects', sanitized.projectId, req.user.id)) {
      return res.status(400).json({ error: 'Invalid request' });
    }
  }

  if (sanitized.sectionId) {
    const targetProjectId = sanitized.projectId !== undefined ? nullableId(sanitized.projectId) : task.project_id;
    const section = queryOne('SELECT project_id FROM sections WHERE id = ? AND user_id = ?', [sanitized.sectionId, req.user.id]);
    if (!section || section.project_id !== targetProjectId) return res.status(400).json({ error: '版块不属于所选项目' });
  }
  if (sanitized.projectId !== undefined && sanitized.sectionId === undefined && sanitized.projectId !== task.project_id) sanitized.sectionId = null;

  // 銆愭暟鎹殧绂汇€戝鏋滄洿鏂颁簡 parentId锛岄獙璇佹柊鐖朵换鍔″睘浜庡綋鍓嶇敤鎴?
  if (sanitized.parentId !== undefined && sanitized.parentId !== null && sanitized.parentId !== '') {
    if (!verifyOwnership('tasks', sanitized.parentId, req.user.id)) {
      return res.status(400).json({ error: 'Parent task not found' });
    }
    // 闃叉寰幆寮曠敤锛氫笉鑳藉皢浠诲姟璁句负鑷韩鐨勫瓙浠诲姟
    if (sanitized.parentId === req.params.id) {
      return res.status(400).json({ error: 'Task cannot be its own parent' });
    }
  }

  const fieldMap = {
    title: 'title', description: 'description', isCompleted: 'is_completed',
    completedAt: 'completed_at', priority: 'priority', dueDate: 'due_date',
    labels: 'labels', plannedPomodoros: 'planned_pomodoros',
    completedPomodoros: 'completed_pomodoros', pomodoroCount: 'pomodoro_count',
    estimatedMinutes: 'estimated_minutes', sortOrder: 'sort_order',
    projectId: 'project_id', sectionId: 'section_id', parentId: 'parent_id'
  };

  const sets = [];
  const values = [];
  for (const [jk, dk] of Object.entries(fieldMap)) {
    if (sanitized[jk] !== undefined) {
      let val = sanitized[jk];
      if (jk === 'labels') val = JSON.stringify(val);
      if (['projectId', 'sectionId', 'parentId', 'dueDate', 'completedAt'].includes(jk)) val = nullableId(val);
      if (jk === 'isCompleted') val = val ? 1 : 0;
      sets.push(`${dk} = ?`);
      values.push(val);
    }
  }
  if (sets.length > 0) {
    sets.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id);
    run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, values);
  }

  const updated = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  const mapped = mapTask(updated);

  // 馃敂 WebSocket: 骞挎挱浠诲姟鏇存柊閫氱煡
  const { notificationService: ns, messageQueue: mq, wsManager: wm } = getWsServices(req);
  ns.broadcast('task:update', { task: mapped, changes: Object.keys(sanitized), userId: req.user.id }, wm, mq);
  logActivity(req.user.id, 'task_updated', 'task', req.params.id, 'Updated task: ' + mapped.title);
  refreshNotifications(req.user.id);

  res.json(mapped);
}));

/**
 * PATCH /:id
 * 部分更新任务 - 与 PUT 逻辑相同，允许部分字段更新
 */
router.patch('/:id', authenticate, validate({ params: taskIdParamSchema, body: updateTaskSchema }), asyncHandler(async (req, res) => {
  const task = queryOne('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const allowed = ['title', 'description', 'isCompleted', 'completedAt', 'priority', 'dueDate', 'labels', 'plannedPomodoros', 'completedPomodoros', 'pomodoroCount', 'estimatedMinutes', 'sortOrder', 'projectId', 'sectionId', 'parentId', 'isRecurring', 'recurrenceRule'];
  const sanitized = pick(req.body, allowed);

  if (sanitized.projectId !== undefined && sanitized.projectId !== null && sanitized.projectId !== '') {
    if (!verifyOwnership('projects', sanitized.projectId, req.user.id)) {
      return res.status(400).json({ error: 'Invalid request' });
    }
  }

  if (sanitized.sectionId) {
    const targetProjectId = sanitized.projectId !== undefined ? nullableId(sanitized.projectId) : task.project_id;
    const section = queryOne('SELECT project_id FROM sections WHERE id = ? AND user_id = ?', [sanitized.sectionId, req.user.id]);
    if (!section || section.project_id !== targetProjectId) return res.status(400).json({ error: '版块不属于所选项目' });
  }
  if (sanitized.projectId !== undefined && sanitized.sectionId === undefined && sanitized.projectId !== task.project_id) sanitized.sectionId = null;

  if (sanitized.parentId !== undefined && sanitized.parentId !== null && sanitized.parentId !== '') {
    if (!verifyOwnership('tasks', sanitized.parentId, req.user.id)) {
      return res.status(400).json({ error: 'Parent task not found' });
    }
    if (sanitized.parentId === req.params.id) {
      return res.status(400).json({ error: 'Task cannot be its own parent' });
    }
  }

  const fieldMap = {
    title: 'title', description: 'description', isCompleted: 'is_completed',
    completedAt: 'completed_at', priority: 'priority', dueDate: 'due_date',
    labels: 'labels', plannedPomodoros: 'planned_pomodoros',
    completedPomodoros: 'completed_pomodoros', pomodoroCount: 'pomodoro_count',
    estimatedMinutes: 'estimated_minutes', sortOrder: 'sort_order',
    projectId: 'project_id', sectionId: 'section_id', parentId: 'parent_id'
  };

  const sets = [];
  const values = [];
  for (const [jk, dk] of Object.entries(fieldMap)) {
    if (sanitized[jk] !== undefined) {
      let val = sanitized[jk];
      if (jk === 'labels') val = JSON.stringify(val);
      if (['projectId', 'sectionId', 'parentId', 'dueDate', 'completedAt'].includes(jk)) val = nullableId(val);
      if (jk === 'isCompleted') val = val ? 1 : 0;
      sets.push(`${dk} = ?`);
      values.push(val);
    }
  }
  if (sets.length > 0) {
    sets.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id);
    run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, values);
  }

  const updated = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  const mapped = mapTask(updated);

  const { notificationService: ns, messageQueue: mq, wsManager: wm } = getWsServices(req);
  ns.broadcast('task:update', { task: mapped, changes: Object.keys(sanitized), userId: req.user.id }, wm, mq);
  logActivity(req.user.id, 'task_updated', 'task', req.params.id, 'Updated task: ' + mapped.title);
  refreshNotifications(req.user.id);

  res.json(mapped);
}));

/**
 * DELETE /:id
 * 鍒犻櫎浠诲姟 - 鍚屾椂鍒犻櫎鍏宠仈鐨勫瓙浠诲姟銆佽瘎璁哄拰鐣ㄨ寗閽熻褰?
 */
router.delete('/:id', authenticate, validate({ params: taskIdParamSchema }), asyncHandler(async (req, res) => {
  const task = queryOne('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  transaction(() => {
    const childIds = queryAll('SELECT id FROM tasks WHERE parent_id = ? AND user_id = ?', [req.params.id, req.user.id]).map(row => row.id);
    for (const id of [req.params.id, ...childIds]) {
      run('DELETE FROM comments WHERE task_id = ? AND user_id = ?', [id, req.user.id]);
      run('DELETE FROM pomodoro_sessions WHERE task_id = ? AND user_id = ?', [id, req.user.id]);
    }
    run('DELETE FROM tasks WHERE parent_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    run('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  });

  // 馃敂 WebSocket: 骞挎挱浠诲姟鍒犻櫎閫氱煡
  const { notificationService, messageQueue, wsManager } = getWsServices(req);
  notificationService.broadcast('task:delete', { taskId: req.params.id, userId: req.user.id }, wsManager, messageQueue);
  logActivity(req.user.id, 'task_deleted', 'task', req.params.id, 'Deleted task: ' + task.title);
  refreshNotifications(req.user.id);

  res.json({ success: true });
}));

/**
 * POST /:id/complete
 * 鍒囨崲浠诲姟瀹屾垚鐘舵€?
 */
router.post('/:id/complete', authenticate, validate({ params: taskIdParamSchema }), asyncHandler(async (req, res) => {
  const task = queryOne('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const newStatus = task.is_completed ? 0 : 1;
  run('UPDATE tasks SET is_completed = ?, completed_at = ?, updated_at = ? WHERE id = ?', [newStatus, newStatus ? new Date().toISOString() : null, new Date().toISOString(), req.params.id]);
  const updated = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  const mapped = mapTask(updated);

  // 馃敂 WebSocket: 骞挎挱浠诲姟瀹屾垚鐘舵€佸彉鏇撮€氱煡
  const { notificationService: ns2, messageQueue: mq2, wsManager: wm2 } = getWsServices(req);
  ns2.broadcast('task:complete', { task: mapped, completed: !!newStatus, userId: req.user.id }, wm2, mq2);
  logActivity(req.user.id, newStatus ? 'task_completed' : 'task_updated', 'task', req.params.id, (newStatus ? 'Completed task: ' : 'Reopened task: ') + mapped.title);
  refreshNotifications(req.user.id);

  res.json(mapped);
}));

module.exports = router;




