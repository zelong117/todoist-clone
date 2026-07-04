/**
 * 番茄钟路由
 * 处理番茄钟会话的开始和停止
 * 
 * 安全措施：
 * - 所有查询都通过 user_id 过滤，确保数据隔离
 * - 开始番茄钟时验证关联任务属于当前用户
 * - 使用 Joi 进行输入验证（模式白名单、ID 格式等）
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run } = require('../db');
const { mapSession } = require('../utils');
const validate = require('../middleware/validate');
const { startPomodoroSchema, stopPomodoroSchema } = require('../validations/pomodoroSchemas');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /sessions
 * 获取当前用户的所有番茄钟会话
 */
router.get('/sessions', authenticate, asyncHandler(async (req, res) => {
  res.json(queryAll('SELECT * FROM pomodoro_sessions WHERE user_id = ? ORDER BY started_at DESC', [req.user.id]).map(mapSession));
}));

/**
 * POST /start
 * 开始新的番茄钟会话 - 验证关联任务所有权
 */
router.post('/start', authenticate, validate({ body: startPomodoroSchema }), asyncHandler(async (req, res) => {
  const { taskId, mode } = req.body;
  const m = mode || 'focus';

  // 【数据隔离】验证 taskId 属于当前用户
  if (taskId) {
    const t = queryOne('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.user.id]);
    if (!t) return res.status(404).json({ error: '任务不存在' });
  }

  const id = uuidv4();
  run('INSERT INTO pomodoro_sessions (id, task_id, user_id, mode, started_at) VALUES (?, ?, ?, ?, ?)', [id, taskId || null, req.user.id, m, new Date().toISOString()]);
  res.status(201).json(mapSession(queryOne('SELECT * FROM pomodoro_sessions WHERE id = ?', [id])));
}));

/**
 * POST /stop
 * 停止番茄钟会话 - 验证会话所有权
 */
router.post('/stop', authenticate, validate({ body: stopPomodoroSchema }), asyncHandler(async (req, res) => {
  const { sessionId, completed } = req.body;

  const s = queryOne('SELECT * FROM pomodoro_sessions WHERE id = ? AND user_id = ?', [sessionId, req.user.id]);
  if (!s) return res.status(404).json({ error: '会话不存在' });
  if (s.ended_at) return res.status(400).json({ error: '会话已结束' });

  const dur = Math.round(((Date.now() - new Date(s.started_at).getTime()) / 60000) * 100) / 100;
  run('UPDATE pomodoro_sessions SET ended_at = ?, duration_minutes = ?, completed = ? WHERE id = ?', [new Date().toISOString(), dur, completed ? 1 : 0, sessionId]);
  res.json(mapSession(queryOne('SELECT * FROM pomodoro_sessions WHERE id = ?', [sessionId])));
}));

module.exports = router;
