const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const port = 6600 + Math.floor(Math.random() * 300);
const dbPath = path.join(os.tmpdir(), `taskflow-auth-sessions-${process.pid}-${Date.now()}.db`);
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

async function login(email, password, userAgent) {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': userAgent },
    body: JSON.stringify({ email, password }),
  });
}

async function main() {
  server = spawn(process.execPath, ['index.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: 'auth-sessions-test-secret', NODE_ENV: 'test' },
    stdio: 'ignore',
  });
  await waitForServer();

  const email = `sessions-${Date.now()}@example.com`;
  const password = 'SessionsTestPass123!';
  const registered = await request('/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Desktop Browser Test' },
    body: JSON.stringify({ email, name: 'Session Test', password }),
  });
  assert.equal(registered.response.status, 201, JSON.stringify(registered.payload));
  const firstToken = registered.payload.token;

  const apiDocs = await request('/docs');
  assert.equal(apiDocs.response.status, 200, JSON.stringify(apiDocs.payload));
  assert.ok(apiDocs.payload.paths['/api/auth/wechat/mini-login']);
  assert.ok(apiDocs.payload.paths['/api/auth/sessions']);
  assert.ok(apiDocs.payload.paths['/api/version']);

  const version = await request('/version');
  assert.equal(version.response.status, 200, JSON.stringify(version.payload));
  assert.equal(version.response.headers.get('x-api-version'), '1.0.0');
  assert.equal(version.payload.apiBasePath, '/api');

  const miniLoginUnavailable = await request('/auth/wechat/mini-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'test-code' }) });
  assert.equal(miniLoginUnavailable.response.status, 503, JSON.stringify(miniLoginUnavailable.payload));

  const secondLogin = await login(email, password, 'Mozilla/5.0 (Linux; Android 14)');
  assert.equal(secondLogin.response.status, 200, JSON.stringify(secondLogin.payload));
  const secondToken = secondLogin.payload.token;
  const firstHeaders = { Authorization: `Bearer ${firstToken}` };
  const secondHeaders = { Authorization: `Bearer ${secondToken}` };

  const sessions = await request('/auth/sessions', { headers: firstHeaders });
  assert.equal(sessions.response.status, 200, JSON.stringify(sessions.payload));
  assert.equal(sessions.payload.sessions.length, 2);
  const other = sessions.payload.sessions.find((session) => !session.current);
  assert.ok(other, 'a second session should be present');
  assert.equal(other.deviceLabel, 'Android device');

  const refreshed = await request('/auth/refresh', { method: 'POST', headers: firstHeaders });
  assert.equal(refreshed.response.status, 200, JSON.stringify(refreshed.payload));
  const refreshedSessions = await request('/auth/sessions', { headers: { Authorization: `Bearer ${refreshed.payload.token}` } });
  assert.equal(refreshedSessions.response.status, 200);

  const revoked = await request(`/auth/sessions/${other.id}`, { method: 'DELETE', headers: firstHeaders });
  assert.equal(revoked.response.status, 200, JSON.stringify(revoked.payload));
  const revokedTokenAccess = await request('/auth/me', { headers: secondHeaders });
  assert.equal(revokedTokenAccess.response.status, 401, JSON.stringify(revokedTokenAccess.payload));

  const logout = await request('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${refreshed.payload.token}` } });
  assert.equal(logout.response.status, 204);
  const currentTokenAccess = await request('/auth/me', { headers: { Authorization: `Bearer ${refreshed.payload.token}` } });
  assert.equal(currentTokenAccess.response.status, 401, JSON.stringify(currentTokenAccess.payload));
  console.log('auth-sessions.test.js: PASS');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  if (server && !server.killed) server.kill('SIGTERM');
  for (const file of [dbPath, `${dbPath}.tmp`]) { try { fs.unlinkSync(file); } catch {} }
});
