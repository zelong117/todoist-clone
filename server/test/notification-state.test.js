const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const port = 7200 + Math.floor(Math.random() * 400);
const dbPath = path.join(os.tmpdir(), `taskflow-notifications-${process.pid}-${Date.now()}.db`);
const base = `http://127.0.0.1:${port}/api`;
let server;

async function request(pathname, options = {}) {
  const response = await fetch(`${base}${pathname}`, options);
  return { response, payload: await response.json().catch(() => null) };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { if ((await fetch(`${base}/health`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Temporary API server did not start');
}

async function main() {
  server = spawn(process.execPath, ['index.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: 'notification-state-test-secret', NODE_ENV: 'test' },
    stdio: 'ignore',
  });
  await waitForServer();
  const registration = await request('/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `notifications-${Date.now()}@example.com`, name: 'Notification Test', password: 'NotificationPass123!' }),
  });
  assert.equal(registration.response.status, 201, JSON.stringify(registration.payload));
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${registration.payload.token}` };
  const task = await request('/tasks', {
    method: 'POST', headers,
    body: JSON.stringify({ title: 'Reminder cleanup', reminderAt: new Date(Date.now() - 60_000).toISOString(), priority: 3 }),
  });
  assert.equal(task.response.status, 201, JSON.stringify(task.payload));

  const due = await request('/notifications', { headers });
  assert.equal(due.response.status, 200, JSON.stringify(due.payload));
  assert.ok(due.payload.some((item) => item.taskId === task.payload.id && item.type === 'reminder_due'));

  const update = await request(`/tasks/${task.payload.id}`, {
    method: 'PUT', headers,
    body: JSON.stringify({ reminderAt: new Date(Date.now() + 86_400_000).toISOString() }),
  });
  assert.equal(update.response.status, 200, JSON.stringify(update.payload));
  const refreshed = await request('/notifications', { headers });
  assert.equal(refreshed.response.status, 200, JSON.stringify(refreshed.payload));
  assert.ok(!refreshed.payload.some((item) => item.taskId === task.payload.id && item.type === 'reminder_due'));
  console.log('notification-state.test.js: PASS');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (server && !server.killed) { server.kill('SIGTERM'); await new Promise((resolve) => server.once('exit', resolve)); }
  for (const file of [dbPath, `${dbPath}.tmp`]) { try { fs.unlinkSync(file); } catch {} }
});
