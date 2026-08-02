const assert = require('assert');
const { randomUUID } = require('crypto');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Keep isolated API tests away from the default Vite development range (5173).
const port = 5600 + Math.floor(Math.random() * 1000);
const dbPath = path.join(os.tmpdir(), `taskflow-version-${process.pid}-${Date.now()}.db`);
const base = `http://127.0.0.1:${port}/api`;
let server;

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(`${base}/health`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Temporary API server did not start');
}

async function request(pathname, options = {}) {
  const response = await fetch(`${base}${pathname}`, options);
  return { response, payload: await response.json().catch(() => null) };
}

async function main() {
  server = spawn(process.execPath, ['index.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: 'task-version-test-secret', NODE_ENV: 'test' },
    stdio: 'ignore',
  });
  await waitForServer();

  const registration = await request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `version-${process.pid}-${Date.now()}@example.com`, name: 'Version Test', password: 'VersionPass123!' }),
  });
  assert.equal(registration.response.status, 201, JSON.stringify(registration.payload));
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${registration.payload.token}` };
  const taskId = randomUUID();
  const reminderAt = '2030-01-02T09:30:00.000Z';
  const created = await request('/tasks', { method: 'POST', headers, body: JSON.stringify({ id: taskId, title: 'Versioned task', reminderAt, location: 'Studio A' }) });
  assert.equal(created.response.status, 201, JSON.stringify(created.payload));
  assert.equal(created.payload.reminderAt, reminderAt);
  assert.equal(created.payload.location, 'Studio A');
  const originalVersion = created.payload.updatedAt;

  const current = await request(`/tasks/${taskId}`, {
    method: 'PUT',
    headers: { ...headers, 'If-Match-Updated-At': originalVersion },
    body: JSON.stringify({ title: 'Updated by the other device', location: 'Studio B' }),
  });
  assert.equal(current.response.status, 200, JSON.stringify(current.payload));
  assert.equal(current.payload.location, 'Studio B');
  assert.notEqual(current.payload.updatedAt, originalVersion);

  for (const [method, suffix, body] of [
    ['PUT', '', JSON.stringify({ title: 'Stale put' })],
    ['PATCH', '', JSON.stringify({ title: 'Stale patch' })],
    ['DELETE', '', undefined],
    ['POST', '/complete', undefined],
  ]) {
    const stale = await request(`/tasks/${taskId}${suffix}`, { method, headers: { ...headers, 'If-Match-Updated-At': originalVersion }, body });
    assert.equal(stale.response.status, 409, `${method} must reject a stale task version`);
    assert.equal(stale.payload.code, 'TASK_VERSION_CONFLICT');
    assert.equal(stale.payload.task.title, 'Updated by the other device');
    assert.equal(stale.payload.task.updatedAt, current.payload.updatedAt);
  }
  console.log('task-version-conflict.test.js: PASS');
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => {
    if (server && !server.killed) server.kill('SIGTERM');
    for (const file of [dbPath, `${dbPath}.tmp`]) {
      try { fs.unlinkSync(file); } catch {}
    }
  });
