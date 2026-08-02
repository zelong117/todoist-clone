const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const port = 5700 + Math.floor(Math.random() * 500);
const dbPath = path.join(os.tmpdir(), `taskflow-admin-${process.pid}-${Date.now()}.db`);
const base = `http://127.0.0.1:${port}/api`;
const env = { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: 'admin-api-test-secret', NODE_ENV: 'test' };
let server;

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { if ((await fetch(`${base}/health`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Temporary API server did not start');
}

function start() {
  server = spawn(process.execPath, ['index.js'], { cwd: path.resolve(__dirname, '..'), env, stdio: 'ignore' });
  return waitForServer();
}

async function stop() {
  if (!server || server.killed) return;
  server.kill('SIGTERM');
  await new Promise((resolve) => server.once('exit', resolve));
}

async function request(pathname, options = {}) {
  const response = await fetch(`${base}${pathname}`, options);
  return { response, payload: await response.json().catch(() => null) };
}

async function register(email) {
  const result = await request('/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name: email.split('@')[0], password: 'AdminTestPass123!' }),
  });
  assert.equal(result.response.status, 201, JSON.stringify(result.payload));
  return result.payload;
}

async function main() {
  await start();
  const admin = await register(`admin-${Date.now()}@example.com`);
  const member = await register(`member-${Date.now()}@example.com`);
  await stop();

  process.env.DB_PATH = dbPath;
  const { flushPendingWrites, initDB, run } = require('../db');
  await initDB();
  run("UPDATE users SET role = 'admin' WHERE id = ?", [admin.user.id]);
  flushPendingWrites();

  await start();
  const adminHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` };
  const overview = await request('/admin/overview', { headers: adminHeaders });
  assert.equal(overview.response.status, 200, JSON.stringify(overview.payload));
  assert.equal(overview.payload.users.total, 2);

  const users = await request('/admin/users', { headers: adminHeaders });
  assert.equal(users.response.status, 200, JSON.stringify(users.payload));
  assert.equal(users.payload.data.length, 2);

  const freeze = await request(`/admin/users/${member.user.id}/freeze`, {
    method: 'POST', headers: adminHeaders, body: JSON.stringify({ frozen: true, reason: 'Integration test account freeze' }),
  });
  assert.equal(freeze.response.status, 200, JSON.stringify(freeze.payload));
  const frozenMe = await request('/auth/me', { headers: { Authorization: `Bearer ${member.token}` } });
  assert.equal(frozenMe.response.status, 403, JSON.stringify(frozenMe.payload));

  const unfreeze = await request(`/admin/users/${member.user.id}/freeze`, {
    method: 'POST', headers: adminHeaders, body: JSON.stringify({ frozen: false, reason: 'Integration test account restore' }),
  });
  assert.equal(unfreeze.response.status, 200, JSON.stringify(unfreeze.payload));
  const restoredMe = await request('/auth/me', { headers: { Authorization: `Bearer ${member.token}` } });
  assert.equal(restoredMe.response.status, 200, JSON.stringify(restoredMe.payload));
  console.log('admin-api.test.js: PASS');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await stop();
  for (const file of [dbPath, `${dbPath}.tmp`]) { try { fs.unlinkSync(file); } catch {} }
});
