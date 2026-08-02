/**
 * 认证路由
 * 处理用户注册、登录和获取当前用户信息
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { queryOne, run, transaction } = require('../db');
const { authenticate } = require('../middleware/auth');
const { createAuthenticatedSession, issueToken, listSessions, revokeAllSessions, revokeOtherSessions, revokeSession } = require('../services/authSessions');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validations/authSchemas');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');
const { generateResetToken, verifyResetToken } = require('../utils/passwordReset');
const { logActivity } = require('../domain');

/**
 * POST /register
 * 用户注册 - 使用 Joi 验证输入，邮箱自动小写化去重
 */
router.post('/register', validate({ body: registerSchema }), asyncHandler(async (req, res) => {
  const { email, name, password } = req.body;

  // 邮箱统一小写化，避免大小写变体重复注册
  const normalizedEmail = email.toLowerCase();

  const existing = queryOne('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (existing) return res.status(400).json({ error: '该邮箱已被注册' });

  const id = uuidv4();
  const hash = await bcrypt.hash(password, 12);
  transaction(() => {
    run('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)', [id, normalizedEmail, name.trim(), hash]);
  });

  const { token } = createAuthenticatedSession({ id, role: 'user' }, req.get('user-agent'));
  res.status(201).json({ token, user: { id, email: normalizedEmail, name: name.trim() } });

  // 异步发送欢迎邮件（不阻塞响应）
  sendWelcomeEmail(normalizedEmail, name.trim()).catch(err => {
    console.error('Failed to send welcome email:', err.message);
  });
}));

/**
 * POST /login
 * 用户登录 - 使用 Joi 验证输入
 */
router.post('/login', validate({ body: loginSchema }), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = queryOne('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (!user) return res.status(401).json({ error: '邮箱或密码错误' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: '邮箱或密码错误' });

  const { token } = createAuthenticatedSession(user, req.get('user-agent'));
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
}));

/**
 * GET /me
 * 获取当前登录用户信息 - 需要认证
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = queryOne('SELECT id, email, name, role FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
}));

/**
 * POST /forgot-password
 * 忘记密码 - 发送重置链接邮件
 */
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: '请输入邮箱' });

  const user = queryOne('SELECT id, email, name FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (!user) {
    // 不暴露用户是否存在
    return res.json({ success: true, message: '如果该邮箱已注册，您将收到重置邮件' });
  }

  const token = generateResetToken(user.email);
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const resetLink = `${appUrl}/reset-password?token=${token}`;

  sendPasswordResetEmail(user.email, resetLink).catch(err => {
    console.error('Failed to send reset email:', err.message);
  });

  res.json({ success: true, message: '如果该邮箱已注册，您将收到重置邮件' });
}));

/**
 * POST /reset-password
 * 重置密码 - 验证 token 并设置新密码
 */
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: '缺少 token 或新密码' });
  if (password.length < 8) return res.status(400).json({ error: '密码至少8位' });

  const payload = verifyResetToken(token);
  if (!payload) return res.status(400).json({ error: '重置链接无效或已过期' });

  const user = queryOne('SELECT id FROM users WHERE email = ?', [payload.email]);
  if (!user) return res.status(400).json({ error: '用户不存在' });

  const hash = await bcrypt.hash(password, 12);
  transaction(() => {
    run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
    revokeAllSessions(user.id, 'password_reset');
  });

  res.json({ success: true, message: '密码重置成功' });
}));


/**
 * POST /refresh
 * 刷新 Token - 验证当前 Token 有效后下发新 Token
 * 允许用户在 Token 过期前无感续期
 */
router.post('/refresh', authenticate, asyncHandler(async (req, res) => {
  const user = queryOne('SELECT id, email, name, role FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(401).json({ error: 'User not found' });

  const token = issueToken(user, { id: req.user.sid, tokenId: req.user.jti });
  res.json({ token, user });
}));

router.get('/sessions', authenticate, asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ sessions: listSessions(req.user.id, req.user.sid) });
}));

router.delete('/sessions/:sessionId', authenticate, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  if (sessionId === req.user.sid) return res.status(400).json({ error: 'Use logout to end this device session' });
  if (!revokeSession(req.user.id, sessionId, 'remote_sign_out')) return res.status(404).json({ error: 'Active session not found' });
  req.app.locals.wsManager?.disconnectSession(sessionId, 'Session signed out remotely');
  logActivity(req.user.id, 'session_revoked', 'auth_session', sessionId, 'Signed out another device session');
  res.json({ success: true });
}));

router.post('/sessions/revoke-others', authenticate, asyncHandler(async (req, res) => {
  revokeOtherSessions(req.user.id, req.user.sid, 'revoke_other_sessions');
  req.app.locals.wsManager?.disconnectOtherUserSessions(req.user.id, req.user.sid, 'Signed out from another device');
  logActivity(req.user.id, 'sessions_revoked', 'auth_session', req.user.sid, 'Signed out all other device sessions');
  res.json({ success: true });
}));

router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  revokeSession(req.user.id, req.user.sid, 'logout');
  res.status(204).end();
}));

module.exports = router;
