const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { queryOne, run, transaction } = require('../db');
const { assignPlan, normalizePlan } = require('./plans');

function verifySignature(rawBody, signature, secret) {
  if (!secret || typeof signature !== 'string') return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const actual = signature.replace(/^sha256=/, '');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual, 'utf8'), Buffer.from(expected, 'utf8'));
}

function applyEvent(provider, event, rawBody) {
  if (!event || typeof event.id !== 'string' || typeof event.type !== 'string' || typeof event.data !== 'object') throw new Error('Invalid payment event');
  const existing = queryOne('SELECT id FROM payment_orders WHERE provider = ? AND provider_event_id = ?', [provider, event.id]);
  if (existing) return { replay: true };
  const { userId, plan, currentPeriodEnd = null, gracePeriodEnd = null, amountCents = 0, currency = 'USD', failureReason = null } = event.data;
  if (typeof userId !== 'string' || !userId) throw new Error('Invalid payment user');
  if (!queryOne('SELECT id FROM users WHERE id = ?', [userId])) throw new Error('Payment user not found');
  const normalizedPlan = normalizePlan(plan);
  if (normalizedPlan !== plan || normalizedPlan === 'free') throw new Error('Invalid paid plan');
  if (currentPeriodEnd !== null && Number.isNaN(new Date(currentPeriodEnd).getTime())) throw new Error('Invalid period end');
  if (gracePeriodEnd !== null && Number.isNaN(new Date(gracePeriodEnd).getTime())) throw new Error('Invalid grace period end');
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  const status = event.type === 'payment.failed' ? 'failed' : 'paid';

  transaction(() => {
    run(
      'INSERT INTO payment_orders (id, user_id, provider, provider_event_id, plan, amount_cents, currency, status, payload_hash, processed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), userId, provider, event.id, normalizedPlan, amountCents, currency, status, payloadHash, new Date().toISOString()]
    );
    if (event.type === 'subscription.activated' || event.type === 'subscription.renewed') {
      assignPlan({ userId, plan: normalizedPlan, actorId: userId, expiresAt: currentPeriodEnd, source: `webhook:${provider}` });
    } else if (event.type === 'subscription.cancelled') {
      run("UPDATE subscriptions SET status = 'cancelled', cancel_at_period_end = 1, current_period_end = COALESCE(?, current_period_end), updated_at = ? WHERE user_id = ? AND status IN ('active', 'past_due')", [currentPeriodEnd, new Date().toISOString(), userId]);
    } else if (event.type === 'payment.failed') {
      const defaultGraceEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      run("UPDATE subscriptions SET status = 'past_due', grace_period_end = ?, failed_attempts = COALESCE(failed_attempts, 0) + 1, last_payment_error = ?, updated_at = ? WHERE user_id = ? AND status = 'active'", [gracePeriodEnd || defaultGraceEnd, typeof failureReason === 'string' ? failureReason.slice(0, 300) : null, new Date().toISOString(), userId]);
    } else {
      throw new Error('Unsupported payment event');
    }
  });
  return { replay: false };
}

module.exports = { verifySignature, applyEvent };
