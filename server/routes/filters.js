const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run } = require('../db');
const { mapFilter } = require('../utils');
const { asyncHandler } = require('../middleware/errorHandler');
const { ensureBuiltInFilters, getFilteredTasks } = require('../domain');

router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  ensureBuiltInFilters(req.user.id);
  const rows = queryAll('SELECT * FROM filters WHERE user_id = ? ORDER BY sort_order, name', [req.user.id]);
  res.json(rows.map(mapFilter));
}));

router.get('/:id/tasks', asyncHandler(async (req, res) => {
  ensureBuiltInFilters(req.user.id);
  const row = queryOne('SELECT * FROM filters WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!row) return res.status(404).json({ error: 'Filter not found' });
  res.json(getFilteredTasks(req.user.id, row.query));
}));

router.post('/', asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const query = String(req.body.query || '').trim();
  if (!name || !query) return res.status(400).json({ error: 'Name and query are required' });

  const id = uuidv4();
  const order = Number.isFinite(req.body.order) ? req.body.order : 100;
  run(
    'INSERT INTO filters (id, user_id, name, description, query, is_builtin, sort_order) VALUES (?, ?, ?, ?, ?, 0, ?)',
    [id, req.user.id, name, String(req.body.description || ''), query, order]
  );
  res.status(201).json(mapFilter(queryOne('SELECT * FROM filters WHERE id = ?', [id])));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const current = queryOne('SELECT * FROM filters WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!current) return res.status(404).json({ error: 'Filter not found' });
  if (current.is_builtin) return res.status(400).json({ error: 'Built-in filters cannot be edited' });

  const name = req.body.name === undefined ? current.name : String(req.body.name).trim();
  const query = req.body.query === undefined ? current.query : String(req.body.query).trim();
  if (!name || !query) return res.status(400).json({ error: 'Name and query are required' });

  run(
    'UPDATE filters SET name = ?, description = ?, query = ?, sort_order = ? WHERE id = ? AND user_id = ?',
    [name, req.body.description ?? current.description, query, req.body.order ?? current.sort_order, req.params.id, req.user.id]
  );
  res.json(mapFilter(queryOne('SELECT * FROM filters WHERE id = ?', [req.params.id])));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const current = queryOne('SELECT * FROM filters WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!current) return res.status(404).json({ error: 'Filter not found' });
  if (current.is_builtin) return res.status(400).json({ error: 'Built-in filters cannot be deleted' });
  run('DELETE FROM filters WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ success: true });
}));

module.exports = router;
