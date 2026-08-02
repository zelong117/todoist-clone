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

const allowedTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['application/pdf', '.pdf'],
  ['text/plain', '.txt'],
  ['text/markdown', '.md'],
]);

function hasExpectedFileSignature(filePath, mimetype) {
  const header = fs.readFileSync(filePath).subarray(0, 16);
  if (mimetype === 'image/jpeg') return header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  if (mimetype === 'image/png') return header.length >= 8 && header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimetype === 'image/webp') return header.length >= 12 && header.subarray(0, 4).toString() === 'RIFF' && header.subarray(8, 12).toString() === 'WEBP';
  if (mimetype === 'application/pdf') return header.length >= 5 && header.subarray(0, 5).toString() === '%PDF-';
  return !header.includes(0);
}

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
  fileFilter: (req, file, cb) => {
    const expectedExtension = allowedTypes.get(file.mimetype);
    const actualExtension = path.extname(file.originalname).toLowerCase();
    if (!expectedExtension || actualExtension !== expectedExtension) {
      const error = new Error('Unsupported attachment type');
      error.statusCode = 400;
      return cb(error);
    }
    cb(null, true);
  },
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
  if (!hasExpectedFileSignature(req.file.path, req.file.mimetype)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Attachment content does not match its declared type' });
  }

  const id = uuidv4();
  const { originalname, filename, size, mimetype } = req.file;
  run('INSERT INTO attachments (id, task_id, user_id, filename, original_name, size, mimetype) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, req.params.taskId, req.user.id, filename, originalname, size, mimetype]);

  res.status(201).json({ id, taskId: req.params.taskId, filename, originalName: originalname, size, mimetype });
}));

// Files are intentionally not exposed through express.static: the attachment row is the authorization boundary.
router.get('/attachments/file/:filename', authenticate, asyncHandler(async (req, res) => {
  const requested = req.params.filename;
  if (path.basename(requested) !== requested) return res.status(400).json({ error: 'Invalid attachment filename' });
  const attachment = queryOne('SELECT filename, original_name, mimetype FROM attachments WHERE filename = ? AND user_id = ?', [requested, req.user.id]);
  if (!attachment) return res.status(404).json({ error: 'Attachment not found' });
  const filePath = path.join(ATTACH_DIR, attachment.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Attachment file is unavailable' });
  res.setHeader('Cache-Control', 'private, no-store');
  res.type(attachment.mimetype || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.original_name)}"`);
  res.sendFile(filePath);
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
