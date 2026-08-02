const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run, transaction } = require('../db');
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

router.get('/me/export', authenticate, asyncHandler(async (req, res) => {
  const profile = queryOne('SELECT id, email, name, role, plan, plan_expires_at, avatar_url, settings, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!profile) return res.status(404).json({ error: 'User not found' });
  let settings = {};
  try { settings = profile.settings ? JSON.parse(profile.settings) : {}; } catch {}
  delete profile.settings;
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    exportedAt: new Date().toISOString(), schemaVersion: 1,
    profile: { ...profile, settings },
    projects: queryAll('SELECT * FROM projects WHERE user_id = ? ORDER BY sort_order', [req.user.id]),
    tasks: queryAll('SELECT * FROM tasks WHERE user_id = ? ORDER BY sort_order', [req.user.id]),
    sections: queryAll('SELECT * FROM sections WHERE user_id = ? ORDER BY sort_order', [req.user.id]),
    labels: queryAll('SELECT * FROM labels WHERE user_id = ?', [req.user.id]),
    comments: queryAll('SELECT * FROM comments WHERE user_id = ?', [req.user.id]),
    pomodoroSessions: queryAll('SELECT * FROM pomodoro_sessions WHERE user_id = ?', [req.user.id]),
    activity: queryAll('SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]),
    teams: queryAll('SELECT t.id, t.name, t.description, tm.role, tm.joined_at FROM teams t JOIN team_members tm ON tm.team_id = t.id WHERE tm.user_id = ?', [req.user.id]),
  });
}));

router.delete('/me', authenticate, asyncHandler(async (req, res) => {
  const { confirmationEmail, password } = req.body || {};
  const user = queryOne('SELECT id, email, password_hash, avatar_url FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (confirmationEmail !== user.email) return res.status(400).json({ error: 'Type your exact email address to confirm account deletion' });
  if (typeof password !== 'string' || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Current password is incorrect' });
  const ownedTeam = queryOne('SELECT id, name FROM teams WHERE owner_id = ? LIMIT 1', [req.user.id]);
  if (ownedTeam) return res.status(409).json({ error: `Transfer or remove team "${ownedTeam.name}" before deleting this account` });
  const attachments = queryAll('SELECT filename FROM attachments WHERE user_id = ?', [req.user.id]);
  transaction(() => {
    run('DELETE FROM attachments WHERE user_id = ?', [req.user.id]);
    run('DELETE FROM comments WHERE user_id = ? OR task_id IN (SELECT id FROM tasks WHERE user_id = ?)', [req.user.id, req.user.id]);
    run('DELETE FROM notifications WHERE user_id = ?', [req.user.id]);
    run('DELETE FROM pomodoro_sessions WHERE user_id = ?', [req.user.id]);
    run('DELETE FROM sections WHERE user_id = ?', [req.user.id]);
    run('DELETE FROM labels WHERE user_id = ?', [req.user.id]);
    run('DELETE FROM filters WHERE user_id = ?', [req.user.id]);
    run('DELETE FROM project_members WHERE user_id = ? OR project_id IN (SELECT id FROM projects WHERE user_id = ?)', [req.user.id, req.user.id]);
    run('DELETE FROM tasks WHERE user_id = ?', [req.user.id]);
    run('DELETE FROM projects WHERE user_id = ?', [req.user.id]);
    run('DELETE FROM subscriptions WHERE user_id = ?', [req.user.id]);
    run('DELETE FROM payment_orders WHERE user_id = ?', [req.user.id]);
    run('DELETE FROM auth_sessions WHERE user_id = ?', [req.user.id]);
    run('DELETE FROM team_members WHERE user_id = ?', [req.user.id]);
    run('DELETE FROM activity_logs WHERE user_id = ?', [req.user.id]);
    run('DELETE FROM users WHERE id = ?', [req.user.id]);
  });
  for (const attachment of attachments) {
    const target = path.join(ATTACH_DIR, path.basename(attachment.filename));
    try { if (fs.existsSync(target)) fs.unlinkSync(target); } catch (error) { console.error('Unable to remove attachment for deleted account:', error.message); }
  }
  if (user.avatar_url) {
    const avatar = path.join(UPLOAD_DIR, path.basename(user.avatar_url));
    try { if (fs.existsSync(avatar)) fs.unlinkSync(avatar); } catch (error) { console.error('Unable to remove avatar for deleted account:', error.message); }
  }
  res.json({ success: true });
}));

module.exports = router;
