const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { queryAll, queryOne } = require('../db');
const { PLANS, assignPlan, getUserPlan } = require('../services/plans');
const { applyEvent, verifySignature } = require('../services/paymentWebhook');

const router = express.Router();

router.get('/plans', (req, res) => {
  res.json({ plans: Object.values(PLANS) });
});

router.get('/subscription', authenticate, (req, res) => {
  const userPlan = getUserPlan(req.user.id);
  if (!userPlan) return res.status(404).json({ error: 'User not found' });
  const subscription = queryOne(
    "SELECT id, plan, status, source, current_period_start, current_period_end, cancel_at_period_end, grace_period_end, failed_attempts, last_payment_error FROM subscriptions WHERE user_id = ? ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'past_due' THEN 1 WHEN 'cancelled' THEN 2 ELSE 3 END, updated_at DESC LIMIT 1",
    [req.user.id]
  );
  res.json({ plan: userPlan.plan, planExpiresAt: userPlan.plan_expires_at, entitlement: userPlan.entitlement, subscription });
});

router.get('/orders', authenticate, (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 20));
  const offset = (page - 1) * pageSize;
  const total = queryOne('SELECT COUNT(*) AS count FROM payment_orders WHERE user_id = ?', [req.user.id]).count;
  const data = queryAll(
    'SELECT id, provider, provider_event_id, plan, amount_cents, currency, status, processed_at, created_at FROM payment_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [req.user.id, pageSize, offset]
  );
  res.json({ data, page, pageSize, total });
});

// Manual changes are deliberately admin-only. Public checkout is not enabled until a real provider is configured.
router.post('/admin/assign-plan', authenticate, requireAdmin, (req, res) => {
  const { userId, plan, expiresAt = null } = req.body || {};
  if (typeof userId !== 'string' || !userId) return res.status(400).json({ error: 'Target user is required' });
  if (expiresAt !== null && Number.isNaN(new Date(expiresAt).getTime())) return res.status(400).json({ error: 'Invalid expiration date' });
  try {
    const result = assignPlan({ userId, plan, actorId: req.user.id, expiresAt, source: 'admin_manual' });
    res.json({ success: true, userId, ...result });
  } catch (error) {
    res.status(error.message === 'Target user not found' ? 404 : 400).json({ error: error.message });
  }
});

function handleWebhook(req, res) {
  const provider = req.params.provider;
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || provider !== (process.env.PAYMENT_PROVIDER || 'configured')) return res.status(404).json({ error: 'Webhook provider is not configured' });
  const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from('');
  if (!verifySignature(rawBody, req.get('x-taskflow-signature'), secret)) return res.status(401).json({ error: 'Invalid webhook signature' });
  try {
    const event = JSON.parse(rawBody.toString('utf8'));
    const result = applyEvent(provider, event, rawBody);
    res.status(result.replay ? 200 : 201).json({ received: true, replay: result.replay });
  } catch (error) {
    res.status(error.message === 'Payment user not found' ? 404 : 400).json({ error: error.message });
  }
}

module.exports = { router, handleWebhook };
