const assert = require('assert');
const crypto = require('crypto');
const os = require('os');
const path = require('path');

process.env.DB_PATH = path.join(os.tmpdir(), `taskflow-payment-${process.pid}-${Date.now()}.db`);

const { initDB, queryOne, run } = require('../db');
const { applyEvent, verifySignature } = require('../services/paymentWebhook');

async function main() {
  await initDB();
  run('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)', ['payment-user', 'payment@example.com', 'Payment Test', 'not-used']);
  const event = { id: 'evt_payment_test_1', type: 'subscription.activated', data: { userId: 'payment-user', plan: 'pro', amountCents: 800, currency: 'USD', currentPeriodEnd: '2027-01-01T00:00:00.000Z' } };
  const raw = Buffer.from(JSON.stringify(event));
  const secret = 'payment-webhook-test-secret';
  const signature = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  assert.equal(verifySignature(raw, `sha256=${signature}`, secret), true);
  assert.equal(verifySignature(raw, 'invalid', secret), false);
  assert.deepEqual(applyEvent('configured', event, raw), { replay: false });
  assert.equal(queryOne('SELECT plan FROM users WHERE id = ?', ['payment-user']).plan, 'pro');
  assert.equal(queryOne('SELECT COUNT(*) AS count FROM payment_orders WHERE provider_event_id = ?', [event.id]).count, 1);
  assert.deepEqual(applyEvent('configured', event, raw), { replay: true });
  const failedEvent = { id: 'evt_payment_test_2', type: 'payment.failed', data: { userId: 'payment-user', plan: 'pro', amountCents: 800, currency: 'USD', gracePeriodEnd: '2027-01-08T00:00:00.000Z', failureReason: 'Card authorization failed' } };
  assert.deepEqual(applyEvent('configured', failedEvent, Buffer.from(JSON.stringify(failedEvent))), { replay: false });
  const pastDue = queryOne('SELECT status, grace_period_end, failed_attempts, last_payment_error FROM subscriptions WHERE user_id = ?', ['payment-user']);
  assert.equal(pastDue.status, 'past_due');
  assert.equal(pastDue.grace_period_end, '2027-01-08T00:00:00.000Z');
  assert.equal(pastDue.failed_attempts, 1);
  assert.equal(pastDue.last_payment_error, 'Card authorization failed');
  assert.equal(queryOne('SELECT plan FROM users WHERE id = ?', ['payment-user']).plan, 'pro');
  const cancelledEvent = { id: 'evt_payment_test_3', type: 'subscription.cancelled', data: { userId: 'payment-user', plan: 'pro', currentPeriodEnd: '2027-01-01T00:00:00.000Z' } };
  assert.deepEqual(applyEvent('configured', cancelledEvent, Buffer.from(JSON.stringify(cancelledEvent))), { replay: false });
  assert.equal(queryOne('SELECT status, cancel_at_period_end FROM subscriptions WHERE user_id = ?', ['payment-user']).status, 'cancelled');
  console.log('payment-webhook.test.js: PASS');
}

main().catch((error) => { console.error(error); process.exit(1); });
