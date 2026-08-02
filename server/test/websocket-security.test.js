const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const WebSocket = require('ws');

const port = 7000 + Math.floor(Math.random() * 300);
const dbPath = path.join(os.tmpdir(), `taskflow-websocket-${process.pid}-${Date.now()}.db`);
const base = `http://127.0.0.1:${port}/api`;
const wsUrl = `ws://127.0.0.1:${port}/ws`;
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

function openSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const timer = setTimeout(() => reject(new Error('WebSocket did not authenticate')), 4000);
    socket.on('open', () => socket.send(JSON.stringify({ type: 'authenticate', token })));
    socket.on('message', (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type === 'connected') {
        clearTimeout(timer);
        resolve(socket);
      }
    });
    socket.on('error', reject);
  });
}

function waitForMessage(socket, predicate, timeout = 2500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off('message', listener); reject(new Error('Expected WebSocket message was not received')); }, timeout);
    const listener = (raw) => {
      const message = JSON.parse(raw.toString());
      if (predicate(message)) {
        clearTimeout(timer);
        socket.off('message', listener);
        resolve(message);
      }
    };
    socket.on('message', listener);
  });
}

function waitForClose(socket, expectedCode, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Expected WebSocket close was not received')), timeout);
    socket.once('close', (code) => {
      clearTimeout(timer);
      try { assert.equal(code, expectedCode); resolve(); } catch (error) { reject(error); }
    });
  });
}

async function register(email, name) {
  const result = await request('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name, password: 'WebSocketTestPass123!' }) });
  assert.equal(result.response.status, 201, JSON.stringify(result.payload));
  return result.payload;
}

async function main() {
  server = spawn(process.execPath, ['index.js'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: 'websocket-test-secret', NODE_ENV: 'test' }, stdio: 'ignore' });
  await waitForServer();
  const userA = await register(`ws-a-${Date.now()}@example.com`, 'WebSocket A');
  const userB = await register(`ws-b-${Date.now()}@example.com`, 'WebSocket B');

  const queryTokenSocket = new WebSocket(`${wsUrl}?token=${encodeURIComponent(userA.token)}`);
  await waitForClose(queryTokenSocket, 4001, 7000);

  const socketA = await openSocket(userA.token);
  const socketB = await openSocket(userB.token);
  const aHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` };
  const taskEvent = waitForMessage(socketA, (message) => message.type === 'notification' && message.channel === 'task:create');
  const created = await request('/tasks', { method: 'POST', headers: aHeaders, body: JSON.stringify({ title: 'Private realtime task', priority: 1 }) });
  assert.equal(created.response.status, 201, JSON.stringify(created.payload));
  const message = await taskEvent;
  assert.equal(message.data.task.title, 'Private realtime task');
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.equal(socketB.readyState, WebSocket.OPEN, 'other user remains connected but receives no task event');

  const secondLogin = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userA.user.email, password: 'WebSocketTestPass123!' }) });
  assert.equal(secondLogin.response.status, 200, JSON.stringify(secondLogin.payload));
  const revokedSocket = await openSocket(secondLogin.payload.token);
  const sessions = await request('/auth/sessions', { headers: { Authorization: `Bearer ${userA.token}` } });
  const otherSession = sessions.payload.sessions.find((session) => !session.current);
  assert.ok(otherSession);
  const closePromise = waitForClose(revokedSocket, 4001);
  const revoke = await request(`/auth/sessions/${otherSession.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${userA.token}` } });
  assert.equal(revoke.response.status, 200, JSON.stringify(revoke.payload));
  await closePromise;
  const revokedAccess = await request('/auth/me', { headers: { Authorization: `Bearer ${secondLogin.payload.token}` } });
  assert.equal(revokedAccess.response.status, 401);

  socketA.close(); socketB.close();
  console.log('websocket-security.test.js: PASS');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  if (server && !server.killed) server.kill('SIGTERM');
  for (const file of [dbPath, `${dbPath}.tmp`]) { try { fs.unlinkSync(file); } catch {} }
});
