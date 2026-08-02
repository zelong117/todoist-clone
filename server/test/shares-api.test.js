const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const port = 6700 + Math.floor(Math.random() * 500);
const dbPath = path.join(os.tmpdir(), `taskflow-shares-${process.pid}-${Date.now()}.db`);
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

async function register(email, name) {
  const result = await request('/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password: 'ProjectSharePass123!' }),
  });
  assert.equal(result.response.status, 201, JSON.stringify(result.payload));
  return result.payload;
}

async function main() {
  server = spawn(process.execPath, ['index.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: 'shares-api-test-secret', NODE_ENV: 'test' },
    stdio: 'ignore',
  });
  await waitForServer();

  const owner = await register(`owner-${Date.now()}@example.com`, 'Project Owner');
  const member = await register(`member-${Date.now()}@example.com`, 'Project Member');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${owner.token}` };
  const project = await request('/projects', { method: 'POST', headers, body: JSON.stringify({ name: 'Sharing verification' }) });
  assert.equal(project.response.status, 201, JSON.stringify(project.payload));

  const rejected = await request(`/projects/${project.payload.id}/share`, {
    method: 'POST', headers, body: JSON.stringify({ email: member.user.email, role: 'owner' }),
  });
  assert.equal(rejected.response.status, 400, JSON.stringify(rejected.payload));

  const invited = await request(`/projects/${project.payload.id}/share`, {
    method: 'POST', headers, body: JSON.stringify({ email: member.user.email, role: 'member' }),
  });
  assert.equal(invited.response.status, 201, JSON.stringify(invited.payload));
  assert.equal(invited.payload.member.role, 'member');

  const list = await request(`/projects/${project.payload.id}/shares`, { headers });
  assert.equal(list.response.status, 200, JSON.stringify(list.payload));
  assert.ok(list.payload.some((entry) => entry.user_id === member.user.id && entry.role === 'member'));
  console.log('shares-api.test.js: PASS');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (server && !server.killed) { server.kill('SIGTERM'); await new Promise((resolve) => server.once('exit', resolve)); }
  for (const file of [dbPath, `${dbPath}.tmp`]) { try { fs.unlinkSync(file); } catch {} }
});
