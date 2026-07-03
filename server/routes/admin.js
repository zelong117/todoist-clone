const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { queryAll, queryOne } = require('../db');

router.use(authenticate, requireAdmin);

router.get('/stats', (req, res) => {
  try {
    const s = {
      totalTasks: queryOne('SELECT COUNT(*) as c FROM tasks').c,
      completedTasks: queryOne('SELECT COUNT(*) as c FROM tasks WHERE is_completed = 1').c,
      totalProjects: queryOne('SELECT COUNT(*) as c FROM projects').c,
      totalLabels: queryOne('SELECT COUNT(*) as c FROM labels').c,
      totalComments: queryOne('SELECT COUNT(*) as c FROM comments').c,
      totalPomodoros: queryOne('SELECT COUNT(*) as c FROM pomodoro_sessions').c,
      completedPomodoros: queryOne('SELECT COUNT(*) as c FROM pomodoro_sessions WHERE completed = 1').c,
      totalUsers: queryOne('SELECT COUNT(*) as c FROM users').c,
    };
    s.pendingTasks = s.totalTasks - s.completedTasks;
    res.json(s);
  } catch (e) { console.error(e); res.status(500).json({ error: '获取统计失败' }); }
});

router.get('/users', (req, res) => {
  try { res.json(queryAll('SELECT id, email, name, role, created_at FROM users')); }
  catch (e) { console.error(e); res.status(500).json({ error: '获取用户失败' }); }
});

module.exports = router;
