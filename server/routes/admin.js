const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}

router.get('/stats', authenticate, requireAdmin, (req, res) => {
  // 这里应该从数据库查询真实数据
  // 现在返回模拟数据
  res.json({
    totalTasks: 23,
    totalProjects: 4,
    totalLabels: 4,
    totalPomodoros: 0,
    completedTasks: 5,
    pendingTasks: 18
  });
});

router.get('/users', authenticate, requireAdmin, (req, res) => {
  res.json([]);
});

module.exports = router;
