/**
 * 任务路由
 * 处理任务的 CRUD 操作和完成状态切换
 * 
 * 安全措施：
 * - 所有查询都通过 user_id 过滤，确保数据隔离
 * - 创建/更新时验证关联实体（项目、父任务）属于当前用户
 * - 使用 Joi 进行输入验证
 * - 使用 pick() 防止批量赋值攻击
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run } = require('../db');
const { pick, mapTask } = require('../utils');
const validate = require('../middleware/validate');
const { createTaskSchema, updateTaskSchema, taskIdParamSchema } = require('../validations/taskSchemas');
const { asyncHandler } = require('../middleware/errorHandler');

// Helper: get WebSocket services from app.locals
function getWsServices(req) {
  return {
    wsManager: req.app.locals.wsManager,
    notificationService: req.app.locals.notificationService,
    messageQueue: req.app.locals.messageQueue,
  };
}

/**
 * 验证关联实体是否属于当前用户
 * @param {string} entityType - 实体类型（projects/tasks）
 * @param {string} entityId - 实体 ID
 * @param {string} userId - 当前用户 ID
 * @returns {boolean} 是否属于当前用户
 */
function verifyOwnership(entityType, entityId, userId) {
  if (!entityId) return true; // null/undefined 不需要验证
  const entity = queryOne(`SELECT id FROM ${entityType} WHERE id = ? AND user_id = ?`, [entityId, userId]);
  return !!entity;
}

/**
 * GET /
 * 获取当前用户的所有任务
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const rows = queryAll('SELECT * FROM tasks WHERE user_id = ? ORDER BY sort_order', [req.user.id]);
  res.json(rows.map(mapTask));
}));

/**
 * POST /
 * 创建新任务 - 验证关联实体所有权
 */
router.post('/', authenticate, validate({ body: createTaskSchema }), asyncHandler(async (req, res) => {
  const { title, projectId, sectionId, parentId, priority, dueDate, labels, plannedPomodoros } = req.body;

  // 【数据隔离】验证 projectId 属于当前用户
  if (projectId && !verifyOwnership('projects', projectId, req.user.id)) {
    return res.status(400).json({ error: '指定的项目不存在' });
  }

  // 【数据隔离】验证 parentId 属于当前用户（父任务必须是自己的）
  if (parentId && !verifyOwnership('tasks', parentId, req.user.id)) {
    return res.status(400).json({ error: '指定的父任务不存在' });
  }

  // 【数据隔离】验证 sectionId 属于当前用户（如果存在 sections 表）
  if (sectionId) {
    const section = queryOne('SELECT id FROM sections WHERE id = ? AND project_id IN (SELECT id FROM projects WHERE user_id = ?)', [sectionId, req.user.id]);
    if (!section) return res.status(400).json({ error: '指定的分区不存在' });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const pp = plannedPomodoros || 1;
  run('INSERT INTO tasks (id, user_id, project_id, section_id, parent_id, title, priority, due_date, labels, planned_pomodoros, estimated_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.id, projectId || null, sectionId || null, parentId || null, title.trim(), priority || 1, dueDate || null, JSON.stringify(Array.isArray(labels) ? labels : []), pp, pp * 25, now, now]);

  const task = queryOne('SELECT * FROM tasks WHERE id = ?', [id]);
  const mapped = mapTask(task);

  // 🔔 WebSocket: 广播任务创建通知
  const { notificationService, messageQueue, wsManager } = getWsServices(req);
  notificationService.broadcast('task:create', { task: mapped, userId: req.user.id }, wsManager, messageQueue);

  res.status(201).json(mapped);
}));

/**
 * PUT /:id
 * 更新任务 - 验证任务存在性、所有权和关联实体
 */
router.put('/:id', authenticate, validate({ params: taskIdParamSchema, body: updateTaskSchema }), asyncHandler(async (req, res) => {
  const task = queryOne('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!task) return res.status(404).json({ error: '任务不存在' });

  const allowed = ['title', 'description', 'isCompleted', 'completedAt', 'priority', 'dueDate', 'labels', 'plannedPomodoros', 'completedPomodoros', 'pomodoroCount', 'estimatedMinutes', 'sortOrder', 'projectId', 'sectionId', 'parentId'];
  const sanitized = pick(req.body, allowed);

  // 【数据隔离】如果更新了 projectId，验证新项目属于当前用户
  if (sanitized.projectId !== undefined && sanitized.projectId !== null && sanitized.projectId !== '') {
    if (!verifyOwnership('projects', sanitized.projectId, req.user.id)) {
      return res.status(400).json({ error: '指定的项目不存在' });
    }
  }

  // 【数据隔离】如果更新了 parentId，验证新父任务属于当前用户
  if (sanitized.parentId !== undefined && sanitized.parentId !== null && sanitized.parentId !== '') {
    if (!verifyOwnership('tasks', sanitized.parentId, req.user.id)) {
      return res.status(400).json({ error: '指定的父任务不存在' });
    }
    // 防止循环引用：不能将任务设为自身的子任务
    if (sanitized.parentId === req.params.id) {
      return res.status(400).json({ error: '不能将任务设为自身的子任务' });
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

  // 🔔 WebSocket: 广播任务更新通知
  const { notificationService: ns, messageQueue: mq, wsManager: wm } = getWsServices(req);
  ns.broadcast('task:update', { task: mapped, changes: Object.keys(sanitized), userId: req.user.id }, wm, mq);

  res.json(mapped);
}));

/**
 * DELETE /:id
 * 删除任务 - 同时删除关联的子任务、评论和番茄钟记录
 */
router.delete('/:id', authenticate, validate({ params: taskIdParamSchema }), asyncHandler(async (req, res) => {
  const task = queryOne('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!task) return res.status(404).json({ error: '任务不存在' });

  // 级联删除关联数据（限定在同一用户的数据范围内）
  run('DELETE FROM tasks WHERE parent_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  run('DELETE FROM comments WHERE task_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  run('DELETE FROM pomodoro_sessions WHERE task_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  run('DELETE FROM tasks WHERE id = ?', [req.params.id]);

  // 🔔 WebSocket: 广播任务删除通知
  const { notificationService, messageQueue, wsManager } = getWsServices(req);
  notificationService.broadcast('task:delete', { taskId: req.params.id, userId: req.user.id }, wsManager, messageQueue);

  res.json({ success: true });
}));

/**
 * POST /:id/complete
 * 切换任务完成状态
 */
router.post('/:id/complete', authenticate, validate({ params: taskIdParamSchema }), asyncHandler(async (req, res) => {
  const task = queryOne('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!task) return res.status(404).json({ error: '任务不存在' });

  const newStatus = task.is_completed ? 0 : 1;
  run('UPDATE tasks SET is_completed = ?, completed_at = ?, updated_at = ? WHERE id = ?', [newStatus, newStatus ? new Date().toISOString() : null, new Date().toISOString(), req.params.id]);
  const updated = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  const mapped = mapTask(updated);

  // 🔔 WebSocket: 广播任务完成状态变更通知
  const { notificationService: ns2, messageQueue: mq2, wsManager: wm2 } = getWsServices(req);
  ns2.broadcast('task:complete', { task: mapped, completed: !!newStatus, userId: req.user.id }, wm2, mq2);

  res.json(mapped);
}));

module.exports = router;
