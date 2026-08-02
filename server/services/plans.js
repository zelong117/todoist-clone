const { queryOne, run, transaction } = require('../db');
const { v4: uuidv4 } = require('uuid');

const PLANS = Object.freeze({
  free: Object.freeze({ id: 'free', name: 'Free', currency: 'USD', monthlyPriceCents: 0, maxProjects: 5, maxAiPerDay: 3, hostedAi: false }),
  pro: Object.freeze({ id: 'pro', name: 'Pro', currency: 'USD', monthlyPriceCents: 800, maxProjects: 100, maxAiPerDay: 50, hostedAi: true }),
  business: Object.freeze({ id: 'business', name: 'Business', currency: 'USD', monthlyPriceCents: 1600, maxProjects: 500, maxAiPerDay: 250, hostedAi: true }),
});

function normalizePlan(plan) {
  return typeof plan === 'string' && PLANS[plan] ? plan : 'free';
}

function isExpired(expiresAt) {
  return Boolean(expiresAt) && new Date(expiresAt).getTime() <= Date.now();
}

function getUserPlan(userId) {
  const user = queryOne('SELECT id, role, plan, plan_expires_at FROM users WHERE id = ?', [userId]);
  if (!user) return null;
  const plan = isExpired(user.plan_expires_at) ? 'free' : normalizePlan(user.plan);
  return { ...user, plan, entitlement: PLANS[plan] };
}

function assignPlan({ userId, plan, actorId, expiresAt = null, source = 'admin_manual' }) {
  const normalizedPlan = normalizePlan(plan);
  if (normalizedPlan !== plan) throw new Error('Invalid plan');
  const user = queryOne('SELECT id FROM users WHERE id = ?', [userId]);
  if (!user) throw new Error('Target user not found');

  const subscriptionId = uuidv4();
  const now = new Date().toISOString();
  transaction(() => {
    run('UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?', [normalizedPlan, expiresAt, userId]);
    run("UPDATE subscriptions SET status = 'replaced', updated_at = ? WHERE user_id = ? AND status = 'active'", [now, userId]);
    run(
      `INSERT INTO subscriptions (id, user_id, plan, status, source, current_period_start, current_period_end, created_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
      [subscriptionId, userId, normalizedPlan, source, now, expiresAt, now, now]
    );
    run(
      'INSERT INTO activity_logs (id, user_id, type, entity_type, entity_id, message) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), actorId || userId, 'plan_assignment', 'subscription', subscriptionId, `Assigned ${normalizedPlan} plan to ${userId} via ${source}`]
    );
  });

  return { subscriptionId, plan: normalizedPlan, expiresAt };
}

module.exports = { PLANS, normalizePlan, getUserPlan, assignPlan };
