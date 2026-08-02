const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const port = 6100 + Math.floor(Math.random() * 400);
const dbPath = path.join(os.tmpdir(), `taskflow-ai-security-${process.pid}-${Date.now()}.db`);
const base = `http://127.0.0.1:${port}/api`;
const env = { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: 'ai-security-test-secret', NODE_ENV: 'test' };
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
  server = spawn(process.execPath, ['index.js'], { cwd: path.resolve(__dirname, '..'), env, stdio: 'ignore' });
  await waitForServer();

  const registration = await request('/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `ai-${Date.now()}@example.com`, name: 'AI Test', password: 'AiSecurityPass123!' }),
  });
  assert.equal(registration.response.status, 201, JSON.stringify(registration.payload));
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${registration.payload.token}` };

  const task = await request('/tasks', { method: 'POST', headers, body: JSON.stringify({ title: 'Server-owned context task' }) });
  assert.equal(task.response.status, 201, JSON.stringify(task.payload));

  const unauthenticated = await request('/ai/organize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(unauthenticated.response.status, 401, JSON.stringify(unauthenticated.payload));

  const organized = await request('/ai/organize', {
    method: 'POST', headers,
    body: JSON.stringify({ tasks: [{ title: 'Forged client task' }], projects: [{ name: 'Forged project' }] }),
  });
  assert.equal(organized.response.status, 200, JSON.stringify(organized.payload));
  assert.match(organized.payload.result, /Server-owned context task/);
  assert.doesNotMatch(organized.payload.result, /Forged client task|Forged project/);

  const externalImage = await request('/ai/extract-image', {
    method: 'POST', headers, body: JSON.stringify({ image: 'https://127.0.0.1/private.png' }),
  });
  assert.equal(externalImage.response.status, 400, JSON.stringify(externalImage.payload));

  const blockedImage = await request('/ai/extract-image', {
    method: 'POST', headers, body: JSON.stringify({ image: 'data:image/png;base64,iVBORw0KGgo=' }),
  });
  assert.equal(blockedImage.response.status, 200, JSON.stringify(blockedImage.payload));
  assert.equal(blockedImage.payload.mode, 'blocked');

  const externalExtraction = await request('/ai/extract-tasks', {
    method: 'POST', headers, body: JSON.stringify({ image: 'https://127.0.0.1/private.png' }),
  });
  assert.equal(externalExtraction.response.status, 400, JSON.stringify(externalExtraction.payload));

  const extracted = await request('/ai/extract-tasks', {
    method: 'POST', headers, body: JSON.stringify({ text: 'Prepare the project brief; send the review notes' }),
  });
  assert.equal(extracted.response.status, 200, JSON.stringify(extracted.payload));
  assert.ok(Array.isArray(extracted.payload.tasks));
  assert.ok(extracted.payload.tasks.length > 0);

  const optimized = await request('/ai/optimize-text', {
    method: 'POST', headers, body: JSON.stringify({ text: '嗯嗯，整理 一下 这段描述。。' }),
  });
  assert.equal(optimized.response.status, 200, JSON.stringify(optimized.payload));
  assert.ok(optimized.payload.result);

  const audit = await request('/audit-logs', { headers });
  assert.equal(audit.response.status, 200, JSON.stringify(audit.payload));
  const aiEntries = audit.payload.logs.filter((entry) => entry.type === 'ai_usage');
  assert.ok(aiEntries.some((entry) => entry.entity_id === '/organize'));
  assert.ok(aiEntries.some((entry) => entry.entity_id === '/optimize-text'));
  assert.ok(aiEntries.some((entry) => entry.entity_id === '/extract-tasks'));
  assert.ok(!aiEntries.some((entry) => entry.entity_id === '/extract-image'));
  assert.ok(aiEntries.every((entry) => !entry.message.includes('Forged client task')));
  console.log('ai-security.test.js: PASS');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (server && !server.killed) {
    server.kill('SIGTERM');
    await new Promise((resolve) => server.once('exit', resolve));
  }
  for (const file of [dbPath, `${dbPath}.tmp`]) { try { fs.unlinkSync(file); } catch {} }
});
