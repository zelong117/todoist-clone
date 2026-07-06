/**
 * 番茄钟路�?
 * 处理番茄钟会话的开始和停止
 * 
 * 安全措施�?
 * - 所有查询都通过 user_id 过滤，确保数据隔�?
 * - 开始番茄钟时验证关联任务属于当前用�?
 * - 使用 Joi 进行输入验证（模式白名单、ID 格式等）
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run, transaction } = require('../db');
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

  const open = queryOne('SELECT id FROM pomodoro_sessions WHERE user_id = ? AND ended_at IS NULL', [req.user.id]);
  if (open) return res.status(409).json({ error: '已有进行中的番茄钟会�? });

  // 【数据隔离】验�?taskId 属于当前用户
  if (taskId) {
    const t = queryOne('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.user.id]);
    if (!t) return res.status(404).json({ error: '任务不存�? });
  }

  const id = uuidv4();
  run('INSERT INTO pomodoro_sessions (id, task_id, user_id, mode, started_at) VALUES (?, ?, ?, ?, ?)', [id, taskId || null, req.user.id, m, new Date().toISOString()]);
  res.status(201).json(mapSession(queryOne('SELECT * FROM pomodoro_sessions WHERE id = ?', [id])));
}));

/**
 * POST /stop
 * 停止番茄钟会�?- 验证会话所有权
 */
router.post('/stop', authenticate, validate({ body: stopPomodoroSchema }), asyncHandler(async (req, res) => {
  const { sessionId, completed } = req.body;

  const s = queryOne('SELECT * FROM pomodoro_sessions WHERE id = ? AND user_id = ?', [sessionId, req.user.id]);
  if (!s) return res.status(404).json({ error: '会话不存�? });
  if (s.ended_at) return res.status(400).json({ error: '会话已结�? });

  const startedAt = new Date(s.started_at).getTime();
  if (!Number.isFinite(startedAt)) return res.status(500).json({ error: '会话开始时间无�? });

  const endedAt = new Date().toISOString();
  const dur = Math.max(0, Math.round(((Date.now() - startedAt) / 60000) * 100) / 100);
  transaction(() => {
    run('UPDATE pomodoro_sessions SET ended_at = ?, duration_minutes = ?, completed = ? WHERE id = ? AND user_id = ?', [endedAt, dur, completed ? 1 : 0, sessionId, req.user.id]);
    if (completed && s.mode === 'focus' && s.task_id) {
      run('UPDATE tasks SET completed_pomodoros = completed_pomodoros + 1, pomodoro_count = pomodoro_count + 1, updated_at = ? WHERE id = ? AND user_id = ?', [endedAt, s.task_id, req.user.id]);
    }
  });
  res.json(mapSession(queryOne('SELECT * FROM pomodoro_sessions WHERE id = ? AND user_id = ?', [sessionId, req.user.id])));
}));

module.exports = router;
