/**
 * 管理员路由
 * 提供系统统计数据和用户管理功能
 * 
 * 安全措施：
 * - router.use(authenticate, requireAdmin) 确保所有路由都需要管理员权限
 * - 使用 asyncHandler 统一异步错误处理
 */
const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { queryAll, queryOne } = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

// 【管理员权限检查】所有管理员路由都需要认证 + 管理员角色
router.use(authenticate, requireAdmin);

/**
 * GET /stats
 * 获取系统统计数据（仅管理员）
 */
router.get('/stats', asyncHandler(async (req, res) => {
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
}));

/**
 * GET /users
 * 获取所有用户列表（仅管理员，不含密码哈希）
 */
router.get('/users', asyncHandler(async (req, res) => {
  res.json(queryAll('SELECT id, email, name, role, plan, balance, plan_expires_at, created_at FROM users'));
}));

module.exports = router;
