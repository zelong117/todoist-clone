const jwt = require('jsonwebtoken');
const { queryOne } = require('../db');
const { findActiveSession } = require('../services/authSessions');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  const token = authHeader.slice('Bearer '.length);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    const account = queryOne('SELECT id, role, is_frozen FROM users WHERE id = ?', [req.user.id]);
    if (!account) return res.status(401).json({ error: 'Account no longer exists' });
    if (account.is_frozen) return res.status(403).json({ error: 'Account is frozen' });
    if (!findActiveSession(account.id, req.user.sid, req.user.jti)) return res.status(401).json({ error: 'Session has expired or was revoked' });
    req.user.role = account.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: error.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid authentication token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(403).json({ error: 'Administrator permission required' });
  const user = queryOne('SELECT role, is_frozen FROM users WHERE id = ?', [req.user.id]);
  if (!user || user.is_frozen || user.role !== 'admin') return res.status(403).json({ error: 'Administrator permission required' });
  next();
}

module.exports = { authenticate, requireAdmin, JWT_SECRET };
