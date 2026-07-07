const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { queryOne, run } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/auth/google
 * Google OAuth 登录入口（重定向到 Google）
 */
router.get('/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'Google OAuth 未配置' });

  const redirectUri = encodeURIComponent(`${process.env.APP_URL || 'http://localhost:5173'}/api/auth/google/callback`);
  const scope = encodeURIComponent('openid email profile');
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  res.redirect(url);
});

/**
 * GET /api/auth/google/callback
 * Google OAuth 回调
 */
router.get('/google/callback', asyncHandler(async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: '缺少授权码' });

  // 用 code 换 token（需要 axios/node-fetch）
  // 这里先做简化版：返回前端让前端处理
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.APP_URL || 'http://localhost:5173'}/api/auth/google/callback`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) return res.status(400).json({ error: '获取 token 失败' });

  // 获取用户信息
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const googleUser = await userRes.json();

  // 查找或创建用户
  let user = queryOne('SELECT * FROM users WHERE email = ?', [googleUser.email]);
  if (!user) {
    const id = uuidv4();
    run('INSERT INTO users (id, email, name, password_hash, avatar_url) VALUES (?, ?, ?, ?, ?)',
      [id, googleUser.email, googleUser.name, 'oauth', googleUser.picture]);
    user = { id, email: googleUser.email, name: googleUser.name };
  }

  const token = jwt.sign({ id: user.id, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '7d' });
  // 重定向回前端，带 token
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  res.redirect(`${appUrl}/?token=${token}`);
}));

/**
 * GET /api/auth/wechat
 * 微信 OAuth 登录入口
 */
router.get('/wechat', (req, res) => {
  const appId = process.env.WECHAT_APP_ID;
  if (!appId) return res.status(500).json({ error: '微信 OAuth 未配置' });

  const redirectUri = encodeURIComponent(`${process.env.APP_URL || 'http://localhost:5173'}/api/auth/wechat/callback`);
  const scope = 'snsapi_userinfo';
  const url = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}#wechat_redirect`;
  res.redirect(url);
});

/**
 * GET /api/auth/wechat/callback
 * 微信 OAuth 回调
 */
router.get('/wechat/callback', asyncHandler(async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: '缺少授权码' });

  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;

  // 换 access_token
  const tokenRes = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`);
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) return res.status(400).json({ error: '微信授权失败' });

  // 获取用户信息
  const userRes = await fetch(`https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}`);
  const wxUser = await userRes.json();

  // 用 openid 作为唯一标识
  const email = `${wxUser.openid}@wechat.local`;
  let user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    const id = uuidv4();
    run('INSERT INTO users (id, email, name, password_hash, avatar_url) VALUES (?, ?, ?, ?, ?)',
      [id, email, wxUser.nickname, 'oauth', wxUser.headimgurl]);
    user = { id, email, name: wxUser.nickname };
  }

  const token = jwt.sign({ id: user.id, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '7d' });
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  res.redirect(`${appUrl}/?token=${token}`);
}));

module.exports = router;
