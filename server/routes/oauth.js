const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { queryOne, run, transaction } = require('../db');
const { createAuthenticatedSession } = require('../services/authSessions');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
const oauthStates = new Map();
const oauthCodes = new Map();

function createState(provider, usePkce = false) {
  const state = crypto.randomBytes(32).toString('base64url');
  const verifier = usePkce ? crypto.randomBytes(48).toString('base64url') : null;
  oauthStates.set(state, { provider, verifier, expiresAt: Date.now() + 10 * 60 * 1000 });
  return { state, verifier };
}

function consumeState(state, provider) {
  const record = oauthStates.get(state);
  oauthStates.delete(state);
  if (!record || record.provider !== provider || record.expiresAt < Date.now()) return null;
  return record;
}

function createOAuthCode(userId) {
  const code = crypto.randomBytes(32).toString('base64url');
  oauthCodes.set(code, { userId, expiresAt: Date.now() + 60 * 1000 });
  return code;
}

function upsertOAuthUser(email, name, avatar) {
  let user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    const id = uuidv4();
    transaction(() => {
      run('INSERT INTO users (id, email, name, password_hash, avatar_url) VALUES (?, ?, ?, ?, ?)', [id, email, name || 'TaskFlow user', 'oauth', avatar || null]);
    });
    user = queryOne('SELECT * FROM users WHERE id = ?', [id]);
  }
  return user;
}

router.get('/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(503).json({ error: 'Google OAuth is not configured' });
  const { state, verifier } = createState('google', true);
  const redirectUri = `${process.env.APP_URL || 'http://localhost:5173'}/api/auth/google/callback`;
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'openid email profile', state, code_challenge: challenge, code_challenge_method: 'S256' });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get('/google/callback', asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  const oauthState = consumeState(state, 'google');
  if (!code || !oauthState) return res.status(400).json({ error: 'OAuth state or authorization code is invalid' });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.APP_URL || 'http://localhost:5173'}/api/auth/google/callback`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: oauthState.verifier }) });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) return res.status(400).json({ error: 'OAuth token exchange failed' });
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
  const googleUser = await userRes.json();
  const user = upsertOAuthUser(googleUser.email, googleUser.name, googleUser.picture);
  const loginCode = createOAuthCode(user.id);
  res.redirect(`${process.env.APP_URL || 'http://localhost:5173'}/oauth/callback?code=${encodeURIComponent(loginCode)}`);
}));

router.get('/wechat', (req, res) => {
  const appId = process.env.WECHAT_APP_ID;
  if (!appId) return res.status(503).json({ error: 'WeChat OAuth is not configured' });
  const { state } = createState('wechat');
  const redirectUri = `${process.env.APP_URL || 'http://localhost:5173'}/api/auth/wechat/callback`;
  const params = new URLSearchParams({ appid: appId, redirect_uri: redirectUri, response_type: 'code', scope: 'snsapi_userinfo', state });
  res.redirect(`https://open.weixin.qq.com/connect/qrconnect?${params}#wechat_redirect`);
});

router.get('/wechat/callback', asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  if (!code || !consumeState(state, 'wechat')) return res.status(400).json({ error: 'OAuth state or authorization code is invalid' });
  const { WECHAT_APP_ID: appId, WECHAT_APP_SECRET: appSecret } = process.env;
  const tokenRes = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(code)}&grant_type=authorization_code`);
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) return res.status(400).json({ error: 'WeChat OAuth exchange failed' });
  const userRes = await fetch(`https://api.weixin.qq.com/sns/userinfo?access_token=${encodeURIComponent(tokenData.access_token)}&openid=${encodeURIComponent(tokenData.openid)}`);
  const wxUser = await userRes.json();
  const user = upsertOAuthUser(`${wxUser.openid}@wechat.local`, wxUser.nickname, wxUser.headimgurl);
  const loginCode = createOAuthCode(user.id);
  res.redirect(`${process.env.APP_URL || 'http://localhost:5173'}/oauth/callback?code=${encodeURIComponent(loginCode)}`);
}));

router.post('/wechat/mini-login', asyncHandler(async (req, res) => {
  const { code } = req.body || {};
  if (typeof code !== 'string' || code.length < 1 || code.length > 512) return res.status(400).json({ error: 'WeChat login code is required' });
  const { WECHAT_APP_ID: appId, WECHAT_APP_SECRET: appSecret } = process.env;
  if (!appId || !appSecret) return res.status(503).json({ error: 'WeChat Mini Program login is not configured' });
  const params = new URLSearchParams({ appid: appId, secret: appSecret, js_code: code, grant_type: 'authorization_code' });
  const providerResponse = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${params}`);
  const providerData = await providerResponse.json();
  if (!providerResponse.ok || !providerData.openid) return res.status(401).json({ error: 'WeChat login code is invalid or expired' });
  const user = upsertOAuthUser(`${providerData.openid}@wechat.local`, 'TaskFlow WeChat user', null);
  const { token } = createAuthenticatedSession(user, req.get('user-agent'));
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
}));

router.post('/wechat/mini-login', asyncHandler(async (req, res) => {
  const { code } = req.body || {};
  if (typeof code !== 'string' || code.length < 1 || code.length > 512) return res.status(400).json({ error: 'WeChat login code is required' });
  const { WECHAT_APP_ID: appId, WECHAT_APP_SECRET: appSecret } = process.env;
  if (!appId || !appSecret) return res.status(503).json({ error: 'WeChat Mini Program login is not configured' });
  const params = new URLSearchParams({ appid: appId, secret: appSecret, js_code: code, grant_type: 'authorization_code' });
  const providerResponse = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${params}`);
  const providerData = await providerResponse.json();
  if (!providerResponse.ok || !providerData.openid) return res.status(401).json({ error: 'WeChat login code is invalid or expired' });
  const user = upsertOAuthUser(`${providerData.openid}@wechat.local`, 'TaskFlow WeChat user', null);
  const { token } = createAuthenticatedSession(user, req.get('user-agent'));
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
}));

router.post('/oauth/exchange', asyncHandler(async (req, res) => {
  const { code } = req.body || {};
  const record = oauthCodes.get(code);
  oauthCodes.delete(code);
  if (!record || record.expiresAt < Date.now()) return res.status(400).json({ error: 'OAuth code is invalid or expired' });
  const user = queryOne('SELECT id, email, name, role FROM users WHERE id = ?', [record.userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { token } = createAuthenticatedSession(user, req.get('user-agent'));
  res.json({ token, user });
}));

module.exports = router;
