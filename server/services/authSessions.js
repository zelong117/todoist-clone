const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { queryAll, queryOne, run, transaction } = require('../db');
const JWT_SECRET = process.env.JWT_SECRET;

const TOKEN_LIFETIME = '7d';

function deviceLabel(userAgent = '') {
  const agent = String(userAgent).toLowerCase();
  if (agent.includes('micromessenger')) return 'WeChat Mini Program';
  if (agent.includes('android')) return 'Android device';
  if (agent.includes('iphone') || agent.includes('ipad')) return 'Apple device';
  if (agent.includes('electron') || agent.includes('tauri')) return 'Desktop app';
  return 'Browser session';
}

function createSession(userId, userAgent) {
  const id = uuidv4();
  const tokenId = uuidv4();
  transaction(() => {
    run(
      'INSERT INTO auth_sessions (id, user_id, token_id, device_label) VALUES (?, ?, ?, ?)',
      [id, userId, tokenId, deviceLabel(userAgent)],
    );
  });
  return { id, tokenId };
}

function issueToken(user, session) {
  return jwt.sign({ id: user.id, role: user.role || 'user', sid: session.id, jti: session.tokenId }, JWT_SECRET, { expiresIn: TOKEN_LIFETIME });
}

function createAuthenticatedSession(user, userAgent) {
  const session = createSession(user.id, userAgent);
  return { token: issueToken(user, session), sessionId: session.id };
}

function findActiveSession(userId, sessionId, tokenId) {
  if (!sessionId || !tokenId) return null;
  return queryOne(
    'SELECT id FROM auth_sessions WHERE id = ? AND user_id = ? AND token_id = ? AND revoked_at IS NULL',
    [sessionId, userId, tokenId],
  );
}

function listSessions(userId, currentSessionId) {
  return queryAll(
    'SELECT id, device_label, created_at, last_seen_at FROM auth_sessions WHERE user_id = ? AND revoked_at IS NULL ORDER BY last_seen_at DESC, created_at DESC',
    [userId],
  ).map((session) => ({
    id: session.id,
    deviceLabel: session.device_label,
    createdAt: session.created_at,
    lastSeenAt: session.last_seen_at,
    current: session.id === currentSessionId,
  }));
}

function revokeSession(userId, sessionId, reason) {
  const session = queryOne('SELECT id FROM auth_sessions WHERE id = ? AND user_id = ? AND revoked_at IS NULL', [sessionId, userId]);
  if (!session) return false;
  run("UPDATE auth_sessions SET revoked_at = datetime('now'), revoked_reason = ? WHERE id = ?", [reason, sessionId]);
  return true;
}

function revokeOtherSessions(userId, currentSessionId, reason) {
  run("UPDATE auth_sessions SET revoked_at = datetime('now'), revoked_reason = ? WHERE user_id = ? AND id <> ? AND revoked_at IS NULL", [reason, userId, currentSessionId]);
}

function revokeAllSessions(userId, reason) {
  run("UPDATE auth_sessions SET revoked_at = datetime('now'), revoked_reason = ? WHERE user_id = ? AND revoked_at IS NULL", [reason, userId]);
}

module.exports = { createAuthenticatedSession, findActiveSession, issueToken, listSessions, revokeAllSessions, revokeOtherSessions, revokeSession };
