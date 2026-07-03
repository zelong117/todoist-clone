const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

router.get('/stats', authenticate, (req, res) => {
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

router.get('/users', authenticate, (req, res) => {
  // 管理员才能访问
  // 这里应该检查用户角色
  res.json([]);
});

module.exports = router;
