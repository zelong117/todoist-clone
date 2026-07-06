const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { queryAll, run } = require('../db');
const { mapNotification } = require('../utils');
const { asyncHandler } = require('../middleware/errorHandler');
const { refreshNotifications } = require('../domain');

router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  res.json(refreshNotifications(req.user.id));
}));

router.post('/:id/read', asyncHandler(async (req, res) => {
  run('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?', [new Date().toISOString(), req.params.id, req.user.id]);
  res.json({ success: true });
}));

router.post('/read-all', asyncHandler(async (req, res) => {
  run('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', [new Date().toISOString(), req.user.id]);
  res.json({ success: true });
}));

router.get('/unread-count', asyncHandler(async (req, res) => {
  refreshNotifications(req.user.id);
  const rows = queryAll('SELECT id FROM notifications WHERE user_id = ? AND read_at IS NULL', [req.user.id]);
  res.json({ count: rows.length });
}));

module.exports = router;
