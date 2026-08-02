const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { queryAll, queryOne } = require('../db');
const { run } = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAction } = require('./auditLogs');

const router = express.Router();
const ALLOWED_AI_ENDPOINTS = new Set([
  'https://openrouter.ai/api/v1/chat/completions',
  'https://api.openai.com/v1/chat/completions',
]);

router.use(authenticate, requireAdmin);

router.get('/stats', asyncHandler(async (req, res) => {
  const totalUsers = queryOne('SELECT COUNT(*) AS count FROM users').count;
  const paidUsers = queryOne("SELECT COUNT(*) AS count FROM users WHERE plan IN ('pro', 'business')").count;
  const stats = {
    totalTasks: queryOne('SELECT COUNT(*) AS count FROM tasks').count,
    completedTasks: queryOne('SELECT COUNT(*) AS count FROM tasks WHERE is_completed = 1').count,
    totalProjects: queryOne('SELECT COUNT(*) AS count FROM projects').count,
    totalLabels: queryOne('SELECT COUNT(*) AS count FROM labels').count,
    totalComments: queryOne('SELECT COUNT(*) AS count FROM comments').count,
    totalPomodoros: queryOne('SELECT COUNT(*) AS count FROM pomodoro_sessions').count,
    completedPomodoros: queryOne('SELECT COUNT(*) AS count FROM pomodoro_sessions WHERE completed = 1').count,
    totalUsers,
    paidUsers,
    freeUsers: queryOne("SELECT COUNT(*) AS count FROM users WHERE plan = 'free' OR plan IS NULL").count,
    totalRevenue: queryOne('SELECT COALESCE(SUM(balance), 0) AS count FROM users').count,
    recentUsers: queryAll('SELECT email, name, plan, created_at FROM users ORDER BY created_at DESC LIMIT 5'),
    todayRegistrations: queryOne("SELECT COUNT(*) AS count FROM users WHERE date(created_at) = date('now')").count,
    weekRegistrations: queryOne("SELECT COUNT(*) AS count FROM users WHERE created_at >= datetime('now', '-7 days')").count,
  };
  stats.pendingTasks = stats.totalTasks - stats.completedTasks;
  stats.conversionRate = totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 100) : 0;
  res.json(stats);
}));

router.get('/overview', asyncHandler(async (req, res) => {
  const count = (sql, params = []) => queryOne(sql, params).count;
  const users = {
    total: count('SELECT COUNT(*) AS count FROM users'),
    active30d: count("SELECT COUNT(DISTINCT user_id) AS count FROM activity_logs WHERE created_at >= datetime('now', '-30 days')"),
    paid: count("SELECT COUNT(*) AS count FROM users WHERE plan IN ('pro', 'business')"),
    frozen: count('SELECT COUNT(*) AS count FROM users WHERE is_frozen = 1'),
  };
  const taskTrend = queryAll(`
    SELECT date(created_at) AS day, COUNT(*) AS created,
      SUM(CASE WHEN is_completed = 1 AND date(completed_at) = date(created_at) THEN 1 ELSE 0 END) AS completed
    FROM tasks WHERE created_at >= datetime('now', '-6 days') GROUP BY date(created_at) ORDER BY day
  `);
  const planDistribution = queryAll("SELECT COALESCE(plan, 'free') AS plan, COUNT(*) AS count FROM users GROUP BY COALESCE(plan, 'free') ORDER BY count DESC");
  const orders = queryAll('SELECT status, COUNT(*) AS count FROM payment_orders GROUP BY status ORDER BY count DESC');
  const recentAudit = queryAll(`
    SELECT al.id, al.type, al.entity_type, al.entity_id, al.message, al.created_at, u.name, u.email
    FROM activity_logs al LEFT JOIN users u ON u.id = al.user_id
    ORDER BY al.created_at DESC LIMIT 12
  `);
  res.json({
    users,
    entities: {
      teams: count('SELECT COUNT(*) AS count FROM teams'),
      projects: count('SELECT COUNT(*) AS count FROM projects'),
      tasks: count('SELECT COUNT(*) AS count FROM tasks'),
      completedTasks: count('SELECT COUNT(*) AS count FROM tasks WHERE is_completed = 1'),
      attachments: count('SELECT COUNT(*) AS count FROM attachments'),
      attachmentBytes: count('SELECT COALESCE(SUM(size), 0) AS count FROM attachments'),
    },
    planDistribution,
    orderDistribution: orders,
    taskTrend,
    recentAudit,
    runtime: { uptimeSeconds: Math.floor(process.uptime()), memory: process.memoryUsage() },
  });
}));

router.get('/users', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 50));
  const offset = (page - 1) * pageSize;
  const total = queryOne('SELECT COUNT(*) AS count FROM users').count;
  const data = queryAll('SELECT id, email, name, role, plan, balance, plan_expires_at, is_frozen, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?', [pageSize, offset]);
  res.json({ data, page, pageSize, total });
}));

router.post('/users/:id/freeze', asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const { frozen, reason } = req.body || {};
  if (typeof frozen !== 'boolean') return res.status(400).json({ error: 'Frozen must be a boolean' });
  if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 300) return res.status(400).json({ error: 'A 3-300 character reason is required' });
  if (targetId === req.user.id) return res.status(400).json({ error: 'Administrators cannot freeze their own account' });
  const target = queryOne('SELECT id, email, role, is_frozen FROM users WHERE id = ?', [targetId]);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin') return res.status(403).json({ error: 'Administrator accounts cannot be changed here' });
  if (Boolean(target.is_frozen) === frozen) return res.json({ success: true, id: targetId, isFrozen: frozen, unchanged: true });
  run('UPDATE users SET is_frozen = ? WHERE id = ?', [frozen ? 1 : 0, targetId]);
  logAction(req.user.id, frozen ? 'admin_user_frozen' : 'admin_user_unfrozen', 'user', targetId, `${frozen ? 'Froze' : 'Unfroze'} ${target.email}: ${reason.trim()}`);
  res.json({ success: true, id: targetId, isFrozen: frozen });
}));

router.get('/orders', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 25));
  const offset = (page - 1) * pageSize;
  const total = queryOne('SELECT COUNT(*) AS count FROM payment_orders').count;
  const data = queryAll(`
    SELECT po.id, po.provider, po.provider_event_id, po.plan, po.amount_cents, po.currency, po.status, po.processed_at, po.created_at, u.name, u.email
    FROM payment_orders po LEFT JOIN users u ON u.id = po.user_id ORDER BY po.created_at DESC LIMIT ? OFFSET ?
  `, [pageSize, offset]);
  res.json({ data, page, pageSize, total });
}));

router.get('/teams', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 25));
  const offset = (page - 1) * pageSize;
  const total = queryOne('SELECT COUNT(*) AS count FROM teams').count;
  const data = queryAll(`
    SELECT t.id, t.name, t.description, t.created_at, owner.name AS owner_name, owner.email AS owner_email, COUNT(tm.id) AS member_count
    FROM teams t LEFT JOIN users owner ON owner.id = t.owner_id LEFT JOIN team_members tm ON tm.team_id = t.id
    GROUP BY t.id ORDER BY t.created_at DESC LIMIT ? OFFSET ?
  `, [pageSize, offset]);
  res.json({ data, page, pageSize, total });
}));

router.get('/config', asyncHandler(async (req, res) => {
  const key = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '';
  res.json({
    apiKeyConfigured: Boolean(key),
    apiKeyMasked: key ? `${key.slice(0, 6)}***${key.slice(-4)}` : '',
    apiUrl: process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions',
    model: process.env.AI_MODEL || 'openai/gpt-4o-mini',
    allowedEndpoints: [...ALLOWED_AI_ENDPOINTS],
    runtimeChangesAllowed: process.env.NODE_ENV !== 'production',
  });
}));

router.post('/config', asyncHandler(async (req, res) => {
  const { apiUrl, model } = req.body || {};
  if (apiUrl !== undefined && !ALLOWED_AI_ENDPOINTS.has(apiUrl)) return res.status(400).json({ error: 'AI endpoint is not allowlisted' });
  if (model !== undefined && (typeof model !== 'string' || model.length < 1 || model.length > 120)) return res.status(400).json({ error: 'Invalid AI model' });
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'Runtime AI configuration changes are disabled in production' });
  if (apiUrl !== undefined) process.env.AI_API_URL = apiUrl;
  if (model !== undefined) process.env.AI_MODEL = model;
  res.json({ success: true, apiUrl: process.env.AI_API_URL || '', model: process.env.AI_MODEL || '' });
}));

module.exports = router;
