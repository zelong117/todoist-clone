const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run } = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 记录审计日志
 */
function logAction(userId, type, entityType, entityId, message) {
  const id = uuidv4();
  run('INSERT INTO activity_logs (id, user_id, type, entity_type, entity_id, message) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, type, entityType, entityId || '', message]);
}

/**
 * GET /api/audit-logs
 * 获取当前用户的操作日志
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  const logs = queryAll(
    'SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [req.user.id, limit, offset]
  );

  const total = queryOne('SELECT COUNT(*) as count FROM activity_logs WHERE user_id = ?', [req.user.id]);

  res.json({
    logs,
    pagination: {
      page,
      limit,
      total: total?.count || 0,
      totalPages: Math.ceil((total?.count || 0) / limit),
    },
  });
}));

/**
 * GET /api/audit-logs/all
 * 获取所有日志（仅管理员）
 */
router.get('/all', authenticate, asyncHandler(async (req, res) => {
  const user = queryOne('SELECT role FROM users WHERE id = ?', [req.user.id]);
  if (user?.role !== 'admin') return res.status(403).json({ error: '仅管理员可访问' });

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  const logs = queryAll(
    `SELECT al.*, u.name, u.email FROM activity_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  const total = queryOne('SELECT COUNT(*) as count FROM activity_logs');

  res.json({
    logs,
    pagination: { page, limit, total: total?.count || 0, totalPages: Math.ceil((total?.count || 0) / limit) },
  });
}));

module.exports = router;
module.exports.logAction = logAction;
