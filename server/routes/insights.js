const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { queryAll } = require('../db');
const { mapActivityLog } = require('../utils');
const { asyncHandler } = require('../middleware/errorHandler');
const { getStatsSnapshot } = require('../domain');

router.use(authenticate);

router.get('/activity', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const rows = queryAll('SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [req.user.id, limit]);
  res.json(rows.map(mapActivityLog));
}));

router.get('/stats', asyncHandler(async (req, res) => {
  res.json(getStatsSnapshot(req.user.id));
}));

module.exports = router;
