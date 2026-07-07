/**
 * 认证路由
 * 处理用户注册、登录和获取当前用户信息
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { queryOne, run } = require('../db');
const { JWT_SECRET, authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validations/authSchemas');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');
const { generateResetToken, verifyResetToken } = require('../utils/passwordReset');

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
  run('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)', [id, normalizedEmail, name.trim(), hash]);

  const token = jwt.sign({ id, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
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

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
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
  run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);

  res.json({ success: true, message: '密码重置成功' });
}));

module.exports = router;
