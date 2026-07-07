const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run } = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

const ATTACH_DIR = path.join(__dirname, '..', 'data', 'attachments');
if (!fs.existsSync(ATTACH_DIR)) fs.mkdirSync(ATTACH_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ATTACH_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * GET /api/tasks/:taskId/attachments
 */
router.get('/tasks/:taskId/attachments', authenticate, asyncHandler(async (req, res) => {
  const task = queryOne('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [req.params.taskId, req.user.id]);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  res.json(queryAll('SELECT * FROM attachments WHERE task_id = ? ORDER BY created_at', [req.params.taskId]));
}));

/**
 * POST /api/tasks/:taskId/attachments
 */
router.post('/tasks/:taskId/attachments', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
  const task = queryOne('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [req.params.taskId, req.user.id]);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  if (!req.file) return res.status(400).json({ error: '请选择文件' });

  const id = uuidv4();
  const { originalname, filename, size, mimetype } = req.file;
  run('INSERT INTO attachments (id, task_id, user_id, filename, original_name, size, mimetype) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, req.params.taskId, req.user.id, filename, originalname, size, mimetype]);

  res.status(201).json({ id, taskId: req.params.taskId, filename, originalName: originalname, size, mimetype });
}));

/**
 * DELETE /api/tasks/:taskId/attachments/:id
 */
router.delete('/tasks/:taskId/attachments/:id', authenticate, asyncHandler(async (req, res) => {
  const att = queryOne('SELECT * FROM attachments WHERE id = ? AND task_id = ? AND user_id = ?', [req.params.id, req.params.taskId, req.user.id]);
  if (!att) return res.status(404).json({ error: '附件不存在' });

  const filePath = path.join(ATTACH_DIR, att.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  run('DELETE FROM attachments WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

module.exports = router;
