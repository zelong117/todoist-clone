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
    // 商业数据
    paidUsers: queryOne("SELECT COUNT(*) as c FROM users WHERE plan = 'business'").c,
    freeUsers: queryOne("SELECT COUNT(*) as c FROM users WHERE plan = 'free' OR plan IS NULL").c,
    totalRevenue: queryOne('SELECT COALESCE(SUM(balance), 0) as c FROM users').c,
    // 最近注册
    recentUsers: queryAll("SELECT email, name, plan, created_at FROM users ORDER BY created_at DESC LIMIT 5"),
    // 今日注册
    todayRegistrations: queryOne("SELECT COUNT(*) as c FROM users WHERE date(created_at) = date('now')").c,
    // 本周注册
    weekRegistrations: queryOne("SELECT COUNT(*) as c FROM users WHERE created_at >= datetime('now', '-7 days')").c,
    // 付费转化率
    conversionRate: 0,
  };
  s.pendingTasks = s.totalTasks - s.completedTasks;
  s.conversionRate = s.totalUsers > 0 ? Math.round((s.paidUsers / s.totalUsers) * 100) : 0;
  res.json(s);
}));

/**
 * GET /users
 * 获取所有用户列表（仅管理员，不含密码哈希）
 */
router.get('/users', asyncHandler(async (req, res) => {
  res.json(queryAll('SELECT id, email, name, role, plan, balance, plan_expires_at, created_at FROM users'));
}));

// GET /api/admin/config - 获取 AI 配置（脱敏）
router.get('/config', asyncHandler(async (req, res) => {
  const key = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '';
  const masked = key ? key.slice(0, 6) + '***' + key.slice(-4) : '';
  res.json({
    apiKeyMasked: masked,
    apiUrl: process.env.AI_API_URL || '',
    model: process.env.AI_MODEL || '',
    hasKey: !!key,
  });
}));

// POST /api/admin/config - 更新 AI 配置
router.post('/config', asyncHandler(async (req, res) => {
  const { apiKey, apiUrl, model } = req.body;

  // 更新内存中的环境变量（重启后丢失，需要持久化到 .env）
  if (apiKey !== undefined) process.env.AI_API_KEY = apiKey;
  if (apiUrl !== undefined) process.env.AI_API_URL = apiUrl;
  if (model !== undefined) process.env.AI_MODEL = model;

  // 写入 .env 文件持久化
  const fs = require('fs');
  const envPath = require('path').join(__dirname, '..', '.env');
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');

    const updateEnv = (key, value) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const line = `${key}=${value || ''}`;
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, line);
      } else {
        envContent += `\n${line}`;
      }
    };

    if (apiKey !== undefined) updateEnv('OPENAI_API_KEY', apiKey);
    if (apiUrl !== undefined) updateEnv('AI_API_URL', apiUrl);
    if (model !== undefined) updateEnv('AI_MODEL', model);

    fs.writeFileSync(envPath, envContent, 'utf8');
    res.json({ success: true, message: '配置已保存并生效' });
  } catch (e) {
    console.error('Failed to save config:', e);
    res.json({ success: true, message: '配置已生效（内存），但未写入文件' });
  }
}));

module.exports = router;
