const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const port = 3900 + Math.floor(Math.random() * 900);
const dbPath = path.join(os.tmpdir(), `taskflow-recurrence-${process.pid}-${Date.now()}.db`);
const base = `http://127.0.0.1:${port}/api`;
let server;

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${base}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Temporary API server did not start');
}

async function request(pathname, options = {}) {
  const response = await fetch(`${base}${pathname}`, options);
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function main() {
  server = spawn(process.execPath, ['index.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: 'recurrence-test-secret', NODE_ENV: 'test' },
    stdio: 'ignore',
  });
  await waitForServer();
  const email = `recurrence-${process.pid}-${Date.now()}@example.com`;
  const registration = await request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name: 'Recurrence Test', password: 'RecurrencePass123!' }),
  });
  assert.equal(registration.response.status, 201, JSON.stringify(registration.payload));
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${registration.payload.token}` };
  const id = crypto.randomUUID();
  const create = await request('/tasks', {
    method: 'POST',
    headers,
    body: JSON.stringify({ id, title: 'Recurring API verification', dueDate: '2026-08-02', reminderAt: '2026-08-02T09:30:00.000Z', location: 'Studio A', isRecurring: true, recurrenceRule: 'daily' }),
  });
  assert.equal(create.response.status, 201, JSON.stringify(create.payload));
  const invalidUpdate = await request(`/tasks/${id}`, { method: 'PUT', headers, body: JSON.stringify({ isRecurring: true, recurrenceRule: 'invalid' }) });
  assert.equal(invalidUpdate.response.status, 400, 'Invalid recurrence rule should be rejected');
  const complete = await request(`/tasks/${id}/complete`, { method: 'POST', headers });
  assert.equal(complete.response.status, 200, JSON.stringify(complete.payload));
  assert.equal(complete.payload.isCompleted, true);
  assert.ok(complete.payload.nextTask, 'Expected the server to create the next recurrence task');
  assert.equal(complete.payload.nextTask.dueDate, '2026-08-03');
  assert.equal(complete.payload.nextTask.reminderAt, '2026-08-03T09:30:00.000Z');
  assert.equal(complete.payload.nextTask.location, 'Studio A');
  const list = await request('/tasks', { headers });
  assert.ok(list.payload.some((task) => task.id === complete.payload.nextTask.id), 'Next recurrence task did not persist');
  console.log('recurrence-api.test.js: PASS');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  if (server && !server.killed) server.kill('SIGTERM');
  for (const file of [dbPath, `${dbPath}.tmp`]) {
    try { fs.unlinkSync(file); } catch {}
  }
});
