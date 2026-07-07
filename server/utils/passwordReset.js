const crypto = require('crypto');
const { queryOne, run } = require('../db');

const RESET_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const RESET_EXPIRY_MINUTES = 30;

function generateResetToken(email) {
  const payload = {
    email: email.toLowerCase(),
    ts: Date.now(),
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', RESET_SECRET).update(data).digest('hex');
  return `${data}.${hmac}`;
}

function verifyResetToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, hmac] = parts;
  const expectedHmac = crypto.createHmac('sha256', RESET_SECRET).update(data).digest('hex');
  if (hmac !== expectedHmac) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    const ageMs = Date.now() - payload.ts;
    if (ageMs > RESET_EXPIRY_MINUTES * 60 * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = {
  generateResetToken,
  verifyResetToken,
  RESET_EXPIRY_MINUTES,
};
