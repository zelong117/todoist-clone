const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run, transaction } = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
const mapSection = (row) => ({ id: row.id, projectId: row.project_id, name: row.name, order: row.sort_order || 0 });
const validName = (value) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 200;

router.get('/', authenticate, asyncHandler(async (req, res) => {
  res.json(queryAll('SELECT * FROM sections WHERE user_id = ? ORDER BY sort_order, created_at', [req.user.id]).map(mapSection));
}));

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { projectId, name, order = 0 } = req.body;
  if (!validName(name) || !projectId) return res.status(400).json({ error: '版块名称和项目不能为空' });
  const project = queryOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectId, req.user.id]);
  if (!project) return res.status(400).json({ error: '项目不存在' });
  const id = uuidv4();
  const now = new Date().toISOString();
  run('INSERT INTO sections (id, user_id, project_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, req.user.id, projectId, name.trim(), Number(order) || 0, now, now]);
  res.status(201).json(mapSection(queryOne('SELECT * FROM sections WHERE id = ?', [id])));
}));

router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const section = queryOne('SELECT * FROM sections WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!section) return res.status(404).json({ error: '版块不存在' });
  if (req.body.name !== undefined && !validName(req.body.name)) return res.status(400).json({ error: '版块名称不能为空' });
  const name = req.body.name === undefined ? section.name : req.body.name.trim();
  const order = req.body.order === undefined ? section.sort_order : Number(req.body.order) || 0;
  run('UPDATE sections SET name = ?, sort_order = ?, updated_at = ? WHERE id = ?', [name, order, new Date().toISOString(), section.id]);
  res.json(mapSection(queryOne('SELECT * FROM sections WHERE id = ?', [section.id])));
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const section = queryOne('SELECT id FROM sections WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!section) return res.status(404).json({ error: '版块不存在' });
  transaction(() => {
    run('UPDATE tasks SET section_id = NULL, updated_at = ? WHERE section_id = ? AND user_id = ?', [new Date().toISOString(), section.id, req.user.id]);
    run('DELETE FROM sections WHERE id = ?', [section.id]);
  });
  res.json({ success: true });
}));

module.exports = router;
