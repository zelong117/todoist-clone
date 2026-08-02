const assert = require('assert');
const crypto = require('crypto');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const port = 4900 + Math.floor(Math.random() * 800);
const dbPath = path.join(os.tmpdir(), `taskflow-teams-${process.pid}-${Date.now()}.db`);
const base = `http://127.0.0.1:${port}/api`;
const webhookSecret = 'teams-webhook-test-secret';
let server;

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { if ((await fetch(`${base}/health`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Temporary API server did not start');
}

async function request(pathname, options = {}) {
  const response = await fetch(`${base}${pathname}`, options);
  return { response, payload: await response.json().catch(() => null) };
}

async function register(email) {
  const result = await request('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name: email.split('@')[0], password: 'TeamPass123!' }) });
  assert.equal(result.response.status, 201, JSON.stringify(result.payload));
  return result.payload;
}

async function main() {
  server = spawn(process.execPath, ['index.js'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: 'teams-test-secret', PAYMENT_PROVIDER: 'configured', PAYMENT_WEBHOOK_SECRET: webhookSecret, NODE_ENV: 'test' }, stdio: 'ignore' });
  await waitForServer();
  const owner = await register(`owner-${Date.now()}@example.com`);
  const guest = await register(`guest-${Date.now()}@example.com`);
  const event = { id: `evt_team_${Date.now()}`, type: 'subscription.activated', data: { userId: owner.user.id, plan: 'business', amountCents: 1600, currency: 'USD', currentPeriodEnd: '2027-01-01T00:00:00.000Z' } };
  const raw = JSON.stringify(event);
  const signature = crypto.createHmac('sha256', webhookSecret).update(raw).digest('hex');
  const webhook = await request('/billing/webhooks/configured', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-taskflow-signature': `sha256=${signature}` }, body: raw });
  assert.equal(webhook.response.status, 201, JSON.stringify(webhook.payload));
  const ownerHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${owner.token}` };
  const guestHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${guest.token}` };
  const created = await request('/teams', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ name: 'API Team' }) });
  assert.equal(created.response.status, 201, JSON.stringify(created.payload));
  const teamId = created.payload.id;
  const invalidRole = await request(`/teams/${teamId}/invite`, { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ email: guest.user.email, role: 'owner' }) });
  assert.equal(invalidRole.response.status, 400);
  const invited = await request(`/teams/${teamId}/invite`, { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ email: guest.user.email, role: 'guest' }) });
  assert.equal(invited.response.status, 201, JSON.stringify(invited.payload));
  const deniedInvite = await request(`/teams/${teamId}/invite`, { method: 'POST', headers: guestHeaders, body: JSON.stringify({ email: owner.user.email, role: 'member' }) });
  assert.equal(deniedInvite.response.status, 403);
  const promoted = await request(`/teams/${teamId}/members/${guest.user.id}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ role: 'admin' }) });
  assert.equal(promoted.response.status, 200, JSON.stringify(promoted.payload));
  const transfer = await request(`/teams/${teamId}/transfer-ownership`, { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ userId: guest.user.id }) });
  assert.equal(transfer.response.status, 200, JSON.stringify(transfer.payload));
  console.log('teams-api.test.js: PASS');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  if (server && !server.killed) server.kill('SIGTERM');
  for (const file of [dbPath, `${dbPath}.tmp`]) { try { fs.unlinkSync(file); } catch {} }
});
