const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const { queryOne, run } = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

// 头像存储
const UPLOAD_DIR = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `avatar_${req.user.id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('只允许图片文件'));
  },
});

/**
 * POST /api/users/avatar
 * 上传用户头像
 */
router.post('/avatar', authenticate, upload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择文件' });
  const avatarUrl = `/api/uploads/avatar_${req.user.id}${path.extname(req.file.filename)}`;
  run('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user.id]);
  res.json({ success: true, avatarUrl });
}));

/**
 * GET /api/users/settings
 * 获取用户设置（邮件通知等）
 */
router.get('/settings', authenticate, asyncHandler(async (req, res) => {
  const user = queryOne('SELECT settings FROM users WHERE id = ?', [req.user.id]);
  let settings = {};
  if (user?.settings) {
    try { settings = JSON.parse(user.settings); } catch { settings = {}; }
  }
  res.json({
    emailNotifications: settings.emailNotifications ?? true,
    taskReminders: settings.taskReminders ?? true,
    productUpdates: settings.productUpdates ?? false,
    ...settings,
  });
}));

/**
 * PUT /api/users/settings
 * 更新用户设置
 */
router.put('/settings', authenticate, asyncHandler(async (req, res) => {
  const user = queryOne('SELECT settings FROM users WHERE id = ?', [req.user.id]);
  let current = {};
  if (user?.settings) {
    try { current = JSON.parse(user.settings); } catch { current = {}; }
  }
  const updated = { ...current, ...req.body };
  run('UPDATE users SET settings = ? WHERE id = ?', [JSON.stringify(updated), req.user.id]);
  res.json({ success: true, settings: updated });
}));

module.exports = router;
