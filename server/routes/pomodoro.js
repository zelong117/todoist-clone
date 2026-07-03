const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run } = require('../db');
const { mapSession } = require('../utils');

router.get('/sessions', authenticate, (req, res) => {
  try { res.json(queryAll('SELECT * FROM pomodoro_sessions WHERE user_id = ? ORDER BY started_at DESC', [req.user.id]).map(mapSession)); }
  catch (e) { console.error(e); res.status(500).json({ error: '获取番茄会话失败' }); }
});

router.post('/start', authenticate, (req, res) => {
  try {
    const { taskId, mode } = req.body;
    const m = mode || 'focus';
    if (!['focus','shortBreak','longBreak'].includes(m)) return res.status(400).json({ error: '无效的番茄模式' });
    if (taskId) { const t = queryOne('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.user.id]); if (!t) return res.status(404).json({ error: '任务不存在' }); }
    const id = uuidv4();
    run('INSERT INTO pomodoro_sessions (id, task_id, user_id, mode, started_at) VALUES (?, ?, ?, ?, ?)', [id, taskId||null, req.user.id, m, new Date().toISOString()]);
    res.status(201).json(mapSession(queryOne('SELECT * FROM pomodoro_sessions WHERE id = ?', [id])));
  } catch (e) { console.error(e); res.status(500).json({ error: '开始番茄失败' }); }
});

router.post('/stop', authenticate, (req, res) => {
  try {
    const { sessionId, completed } = req.body;
    if (!sessionId) return res.status(400).json({ error: '会话ID不能为空' });
    const s = queryOne('SELECT * FROM pomodoro_sessions WHERE id = ? AND user_id = ?', [sessionId, req.user.id]);
    if (!s) return res.status(404).json({ error: '会话不存在' });
    if (s.ended_at) return res.status(400).json({ error: '会话已结束' });
    const dur = Math.round(((Date.now() - new Date(s.started_at).getTime()) / 60000) * 100) / 100;
    run('UPDATE pomodoro_sessions SET ended_at = ?, duration_minutes = ?, completed = ? WHERE id = ?', [new Date().toISOString(), dur, completed?1:0, sessionId]);
    res.json(mapSession(queryOne('SELECT * FROM pomodoro_sessions WHERE id = ?', [sessionId])));
  } catch (e) { console.error(e); res.status(500).json({ error: '停止番茄失败' }); }
});

module.exports = router;
