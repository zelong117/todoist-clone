const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const port = 6200 + Math.floor(Math.random() * 400);
const dbPath = path.join(os.tmpdir(), `taskflow-account-${process.pid}-${Date.now()}.db`);
const base = `http://127.0.0.1:${port}/api`;
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

async function main() {
  server = spawn(process.execPath, ['index.js'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: 'account-api-test-secret', NODE_ENV: 'test' }, stdio: 'ignore' });
  await waitForServer();
  const email = `account-${Date.now()}@example.com`;
  const password = 'AccountTestPass123!';
  const registered = await request('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name: 'Account Test', password }) });
  assert.equal(registered.response.status, 201, JSON.stringify(registered.payload));
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${registered.payload.token}` };

  const exported = await request('/users/me/export', { headers });
  assert.equal(exported.response.status, 200, JSON.stringify(exported.payload));
  assert.equal(exported.payload.profile.email, email);
  assert.equal(Object.hasOwn(exported.payload.profile, 'password_hash'), false);

  const wrongConfirm = await request('/users/me', { method: 'DELETE', headers, body: JSON.stringify({ confirmationEmail: 'wrong@example.com', password }) });
  assert.equal(wrongConfirm.response.status, 400, JSON.stringify(wrongConfirm.payload));
  const deleted = await request('/users/me', { method: 'DELETE', headers, body: JSON.stringify({ confirmationEmail: email, password }) });
  assert.equal(deleted.response.status, 200, JSON.stringify(deleted.payload));
  const afterDelete = await request('/auth/me', { headers: { Authorization: `Bearer ${registered.payload.token}` } });
  assert.equal(afterDelete.response.status, 401, JSON.stringify(afterDelete.payload));
  console.log('account-api.test.js: PASS');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  if (server && !server.killed) server.kill('SIGTERM');
  for (const file of [dbPath, `${dbPath}.tmp`]) { try { fs.unlinkSync(file); } catch {} }
});
