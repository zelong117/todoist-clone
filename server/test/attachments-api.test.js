const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const port = 6650 + Math.floor(Math.random() * 300);
const dbPath = path.join(os.tmpdir(), `taskflow-attachments-${process.pid}-${Date.now()}.db`);
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

async function register(prefix) {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const result = await request('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name: prefix, password: 'AttachmentTest123!' }) });
  assert.equal(result.response.status, 201, JSON.stringify(result.payload));
  return result.payload;
}

async function main() {
  server = spawn(process.execPath, ['index.js'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: 'attachments-api-test-secret', NODE_ENV: 'test' }, stdio: 'ignore' });
  await waitForServer();
  const owner = await register('attachment-owner');
  const other = await register('attachment-other');
  const headers = { Authorization: `Bearer ${owner.token}`, 'Content-Type': 'application/json' };
  const createdTask = await request('/tasks', { method: 'POST', headers, body: JSON.stringify({ title: 'Attachment authorization test', priority: 1, labels: [] }) });
  assert.equal(createdTask.response.status, 201, JSON.stringify(createdTask.payload));

  const form = new FormData();
  form.append('file', new Blob(['private attachment'], { type: 'text/plain' }), 'private.txt');
  const uploaded = await fetch(`${base}/tasks/${createdTask.payload.id}/attachments`, { method: 'POST', headers: { Authorization: `Bearer ${owner.token}` }, body: form });
  const attachment = await uploaded.json();
  assert.equal(uploaded.status, 201, JSON.stringify(attachment));

  const disguisedImage = new FormData();
  disguisedImage.append('file', new Blob(['not a PNG'], { type: 'image/png' }), 'disguised.png');
  const rejected = await fetch(`${base}/tasks/${createdTask.payload.id}/attachments`, { method: 'POST', headers: { Authorization: `Bearer ${owner.token}` }, body: disguisedImage });
  assert.equal(rejected.status, 400, 'A declared image MIME type must match file bytes');

  const ownerDownload = await fetch(`${base}/attachments/file/${encodeURIComponent(attachment.filename)}`, { headers: { Authorization: `Bearer ${owner.token}` } });
  assert.equal(ownerDownload.status, 200);
  assert.equal(await ownerDownload.text(), 'private attachment');
  const otherDownload = await fetch(`${base}/attachments/file/${encodeURIComponent(attachment.filename)}`, { headers: { Authorization: `Bearer ${other.token}` } });
  assert.equal(otherDownload.status, 404);
  const anonymousDownload = await fetch(`${base}/attachments/file/${encodeURIComponent(attachment.filename)}`);
  assert.equal(anonymousDownload.status, 401);
  console.log('attachments-api.test.js: PASS');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  if (server && !server.killed) server.kill('SIGTERM');
  for (const file of [dbPath, `${dbPath}.tmp`]) { try { fs.unlinkSync(file); } catch {} }
});
