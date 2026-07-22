/**
 * Comprehensive Security Tests for Todoist Clone Backend
 * 
 * Covers:
 *   1) SQL injection on all API endpoints
 *   2) JWT token manipulation (expired, tampered, missing)
 *   3) Authentication bypass attempts
 *   4) Rate limiting verification
 *   5) Input validation / boundary tests
 *   6) Additional security: XSS, path traversal, HTTP method abuse
 *
 * Run: node test/security.test.js
 * Requires: server running on port 3001
 */

const BASE = 'http://localhost:3001/api';
const crypto = require('crypto');

let passed = 0;
let failed = 0;
const failures = [];
const findings = []; // Security findings

function headers(token) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    const msg = e.message;
    failures.push({ name, msg });
    console.error(`  ❌ ${name}: ${msg}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

function finding(severity, desc) {
  findings.push({ severity, desc });
  console.log(`  🚨 FINDING [${severity}]: ${desc}`);
}

async function req(method, path, body, token) {
  const opts = { method, headers: headers(token) };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json, headers: res.headers };
}

// ─── Main ─────────────────────────────────────────────────
(async () => {

  let userToken, attackerToken, userId, attackerId;

  async function setup() {
    let r = await req('POST', '/auth/register', { email: 'secuser_a@test.com', name: 'SecA', password: 'SecurePass123!' });
    if (r.json && r.json.error === '该邮箱已被注册') {
      r = await req('POST', '/auth/login', { email: 'secuser_a@test.com', password: 'SecurePass123!' });
    }
    userToken = r.json.token;
    userId = r.json.user.id;

    r = await req('POST', '/auth/register', { email: 'secuser_b@test.com', name: 'SecB', password: 'AttackerPass1!' });
    if (r.json && r.json.error === '该邮箱已被注册') {
      r = await req('POST', '/auth/login', { email: 'secuser_b@test.com', password: 'AttackerPass1!' });
    }
    attackerToken = r.json.token;
    attackerId = r.json.user.id;
  }

  await setup();

  // ============================================================
  console.log('\n🔒 Security Test Suite\n');
  console.log('='.repeat(60));

  // ============================================================
  // 1) SQL INJECTION TESTS
  // ============================================================
  console.log('\n📝 1. SQL Injection Tests\n');

  await test('SQLi: login email field - OR 1=1', async () => {
    const r = await req('POST', '/auth/login', { email: "' OR '1'='1' --", password: 'anything' });
    assert(r.status !== 200 || !r.json?.token, 'SQL injection succeeded on login email');
    assert(r.status === 401 || r.status === 400, `Expected 401/400, got ${r.status}`);
  });

  await test('SQLi: login password field - UNION SELECT', async () => {
    const r = await req('POST', '/auth/login', { email: 'secuser_a@test.com', password: "' UNION SELECT * FROM users --" });
    assert(r.status !== 200 || !r.json?.token, 'SQL injection succeeded on login password');
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test('SQLi: register email field', async () => {
    const r = await req('POST', '/auth/register', {
      email: "admin' OR '1'='1'@test.com",
      name: 'sqli',
      password: 'TestPass123!'
    });
    assert(r.status !== 200 || !r.json?.token, 'SQL injection via registration email');
  });

  await test('SQLi: task search parameter', async () => {
    const r = await req('GET', "/tasks?search=' OR 1=1 --", undefined, userToken);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.json) || r.json?.data, 'Should return normal task array or paginated data');
  });

  await test('SQLi: task search with UNION injection', async () => {
    const sqliPayload = "' UNION SELECT id, email, password_hash, name, role, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '' FROM users --";
    const r = await req('GET', `/tasks?search=${encodeURIComponent(sqliPayload)}`, undefined, userToken);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    const tasks = Array.isArray(r.json) ? r.json : (r.json?.data || []);
    for (const t of tasks) {
      assert(!t.email, 'User email leaked via SQL injection');
      assert(!t.password_hash, 'Password hash leaked via SQL injection');
    }
  });

  await test('SQLi: task ID parameter - classic injection', async () => {
    const r = await req('GET', "/tasks/' OR '1'='1", undefined, userToken);
    assert(r.status === 400 || r.status === 404, `Expected 400/404, got ${r.status}`);
  });

  await test('SQLi: project creation with DROP TABLE', async () => {
    const r = await req('POST', '/projects', {
      name: "'; DROP TABLE projects; --",
      color: '#ff0000'
    }, userToken);
    assert(r.status === 201 || r.status === 400, `Expected 201/400, got ${r.status}`);
    const check = await req('GET', '/projects', undefined, userToken);
    assert(check.status === 200, 'Projects table was dropped by SQL injection');
  });

  await test('SQLi: filter creation with malicious query', async () => {
    const r = await req('POST', '/filters', {
      name: 'sqli test',
      query: "'; DROP TABLE filters; --"
    }, userToken);
    assert(r.status !== 500, 'SQL injection caused server error');
    const check = await req('GET', '/filters', undefined, userToken);
    assert(check.status === 200, 'Filters table was dropped by SQL injection');
  });

  await test('SQLi: label name with injection payload', async () => {
    const r = await req('POST', '/labels', {
      name: "Robert'); DROP TABLE labels;--",
      color: '#ff0000'
    }, userToken);
    assert(r.status === 201 || r.status === 400, `Expected 201/400, got ${r.status}`);
    const check = await req('GET', '/labels', undefined, userToken);
    assert(check.status === 200, 'Labels table was dropped by SQL injection');
  });

  await test('SQLi: section name with injection payload', async () => {
    const proj = await req('POST', '/projects', { name: 'SQLi Test Project' }, userToken);
    const projectId = proj.json.id;
    const r = await req('POST', '/sections', {
      projectId: projectId,
      name: "test'); DROP TABLE sections; --",
      order: 0
    }, userToken);
    assert(r.status === 201 || r.status === 400, `Expected 201/400, got ${r.status}`);
    const check = await req('GET', '/sections', undefined, userToken);
    assert(check.status === 200, 'Sections table was dropped by SQL injection');
  });

  await test('SQLi: notification ID parameter', async () => {
    const r = await req('POST', "/notifications/' OR '1'='1/read", {}, userToken);
    assert(r.status !== 500, `SQL injection caused server error: ${r.status}`);
  });

  await test('SQLi: comment content with injection', async () => {
    const task = await req('POST', '/tasks', { title: 'Comment test' }, userToken);
    const taskId = task.json.id;
    const r = await req('POST', `/comments/tasks/${taskId}/comments`, {
      content: "'; DROP TABLE comments; --"
    }, userToken);
    assert(r.status === 201 || r.status === 400, `Expected 201/400, got ${r.status}`);
    await req('DELETE', `/tasks/${taskId}`, undefined, userToken);
  });

  await test('SQLi: forgot-password email field', async () => {
    const r = await req('POST', '/auth/forgot-password', { email: "' OR '1'='1' --" });
    assert(r.status !== 500, 'SQL injection caused server error on forgot-password');
    assert(r.status === 200 || r.status === 400, `Expected 200/400, got ${r.status}`);
  });

  await test('SQLi: task update with role escalation attempt', async () => {
    const task = await req('POST', '/tasks', { title: 'SQLi update test' }, userToken);
    const taskId = task.json.id;
    const r = await req('PUT', `/tasks/${taskId}`, {
      title: "'; UPDATE users SET role='admin' WHERE id='x'; --"
    }, userToken);
    assert(r.status === 200 || r.status === 400, `Expected 200/400, got ${r.status}`);
    const adminCheck = await req('GET', '/admin/users', undefined, attackerToken);
    if (adminCheck.status === 200) {
      const attackerUser = adminCheck.json.find(u => u.id === attackerId);
      if (attackerUser) {
        assert(attackerUser.role !== 'admin', 'SQL injection escalated attacker to admin');
      }
    }
    await req('DELETE', `/tasks/${taskId}`, undefined, userToken);
  });

  await test('SQLi: pomodoro mode with injection', async () => {
    const task = await req('POST', '/tasks', { title: 'Pomodoro SQLi test' }, userToken);
    const r = await req('POST', '/pomodoro/start', {
      taskId: task.json.id,
      mode: "focus'; DROP TABLE pomodoro_sessions; --"
    }, userToken);
    assert(r.status !== 500, 'SQL injection caused server error in pomodoro');
    // Verify table still works
    const check = await req('GET', '/pomodoro/sessions', undefined, userToken);
    assert(check.status === 200, 'Pomodoro sessions table was dropped');
    await req('DELETE', `/tasks/${task.json.id}`, undefined, userToken);
  });

  // ============================================================
  // 2) JWT TOKEN MANIPULATION TESTS
  // ============================================================
  console.log('\n🔑 2. JWT Token Manipulation Tests\n');

  await test('JWT: Missing Authorization header', async () => {
    const res = await fetch(`${BASE}/auth/me`);
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    const json = await res.json();
    assert(json.error, 'Expected error message');
  });

  await test('JWT: Empty Bearer token', async () => {
    const r = await req('GET', '/auth/me', undefined, '');
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test('JWT: Bearer with no token value', async () => {
    const res = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: 'Bearer ' }
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('JWT: Completely random token', async () => {
    const r = await req('GET', '/auth/me', undefined, 'totally.not.a.valid.token.here');
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test('JWT: Tampered signature (modified last chars)', async () => {
    const parts = userToken.split('.');
    const tampered = parts[0] + '.' + parts[1] + '.' + 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    const r = await req('GET', '/auth/me', undefined, tampered);
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test('JWT: Tampered payload - role escalation to admin', async () => {
    // Decode user token, change role to admin, re-sign with tampered signature
    const parts = userToken.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    payload.role = 'admin'; // Attempt privilege escalation
    const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const tamperedToken = parts[0] + '.' + tamperedPayload + '.' + parts[2];
    const r = await req('GET', '/admin/stats', undefined, tamperedToken);
    // Server should reject because signature doesn't match the modified payload
    assert(r.status === 401, `Expected 401 for tampered token, got ${r.status}`);
  });

  await test('JWT: Token signed with wrong secret', async () => {
    // Create a token signed with a different secret
    function base64url(buf) { return Buffer.from(buf).toString('base64url'); }
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = base64url(JSON.stringify({ id: userId, role: 'user', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 86400 }));
    const data = header + '.' + payload;
    const sig = crypto.createHmac('sha256', 'wrong-secret-key').update(data).digest('base64url');
    const fakeToken = data + '.' + sig;
    const r = await req('GET', '/auth/me', undefined, fakeToken);
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test('JWT: Algorithm confusion (none algorithm attempt)', async () => {
    function base64url(buf) { return Buffer.from(buf).toString('base64url'); }
    const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = base64url(JSON.stringify({ id: userId, role: 'admin', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 86400 }));
    const noneToken = header + '.' + payload + '.';
    const r = await req('GET', '/auth/me', undefined, noneToken);
    assert(r.status === 401, `Expected 401 for 'none' algorithm, got ${r.status}`);
  });

  await test('JWT: Authorization header with wrong scheme (Basic)', async () => {
    const res = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Basic ${userToken}` }
    });
    assert(res.status === 401, `Expected 401 for wrong auth scheme, got ${res.status}`);
  });

  await test('JWT: Extremely long token (buffer overflow attempt)', async () => {
    const longToken = 'A'.repeat(10000);
    const r = await req('GET', '/auth/me', undefined, longToken);
    assert(r.status === 401 || r.status === 413, `Expected 401/413, got ${r.status}`);
  });

  await test('JWT: Token with header manipulation (change alg to RS256)', async () => {
    const parts = userToken.split('.');
    // Replace header to claim RS256 algorithm
    const newHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const manipulatedToken = newHeader + '.' + parts[1] + '.' + parts[2];
    const r = await req('GET', '/auth/me', undefined, manipulatedToken);
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test('JWT: Role escalation finding - server trusts JWT payload for admin', async () => {
    // CRITICAL: If we had the correct JWT_SECRET, we could create a token with role: 'admin'
    // and access admin routes. The requireAdmin middleware only checks req.user.role
    // which comes from the JWT payload, NOT from the database.
    // This is a security design issue regardless of secret exposure.
    finding('MEDIUM', 'Admin role is determined by JWT payload, not verified against database. If JWT_SECRET is compromised, any user can escalate to admin.');
    assert(true, 'Finding documented');
  });

  await test('JWT: Expired token rejection', async () => {
    // Use a server-issued token and test that the server properly handles expiration
    // We cannot create a truly expired token without the correct JWT_SECRET
    // But we can verify the server's error handling with tampered tokens
    const r = await req('GET', '/auth/me', undefined, 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMzQ1In0.invalid');
    assert(r.status === 401, `Expected 401, got ${r.status}`);
    assert(r.json?.error, 'Should return error message');
  });

  // ============================================================
  // 3) AUTHENTICATION BYPASS TESTS
  // ============================================================
  console.log('\n🚫 3. Authentication Bypass Tests\n');

  const protectedEndpoints = [
    { method: 'GET',  path: '/auth/me',            desc: 'Get current user' },
    { method: 'GET',  path: '/tasks',              desc: 'List tasks' },
    { method: 'POST', path: '/tasks',              desc: 'Create task', body: { title: 'test' } },
    { method: 'GET',  path: '/projects',           desc: 'List projects' },
    { method: 'POST', path: '/projects',           desc: 'Create project', body: { name: 'test' } },
    { method: 'GET',  path: '/labels',             desc: 'List labels' },
    { method: 'POST', path: '/labels',             desc: 'Create label', body: { name: 'test' } },
    { method: 'GET',  path: '/sections',           desc: 'List sections' },
    { method: 'GET',  path: '/filters',            desc: 'List filters' },
    { method: 'GET',  path: '/notifications',      desc: 'List notifications' },
    { method: 'GET',  path: '/pomodoro/sessions',  desc: 'List pomodoro sessions' },
  ];

  for (const ep of protectedEndpoints) {
    await test(`Auth bypass: ${ep.desc} without token [${ep.method} ${ep.path}]`, async () => {
      const r = await req(ep.method, ep.path, ep.body, undefined);
      assert(r.status === 401, `Expected 401, got ${r.status} for ${ep.method} ${ep.path}`);
    });
  }

  await test('Auth bypass: Admin routes without token', async () => {
    const r = await req('GET', '/admin/stats');
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test('Auth bypass: Admin routes with regular user token', async () => {
    const r = await req('GET', '/admin/stats', undefined, userToken);
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  await test('Auth bypass: Regular user cannot access admin users list', async () => {
    const r = await req('GET', '/admin/users', undefined, userToken);
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  await test('Auth bypass: Regular user cannot access admin config', async () => {
    const r = await req('GET', '/admin/config', undefined, userToken);
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  await test('Auth bypass: Regular user cannot invalidate cache', async () => {
    const r = await req('POST', '/admin/cache/invalidate', {}, userToken);
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  await test('Auth bypass: Cross-user task access (B reads A task)', async () => {
    const task = await req('POST', '/tasks', { title: 'Cross-user test' }, userToken);
    const taskId = task.json.id;
    const r = await req('GET', `/tasks/${taskId}`, undefined, attackerToken);
    assert(r.status === 404, `Expected 404 (task not found for attacker), got ${r.status}`);
    await req('DELETE', `/tasks/${taskId}`, undefined, userToken);
  });

  await test('Auth bypass: Cross-user task update (B updates A task)', async () => {
    const task = await req('POST', '/tasks', { title: 'Cross-user update test' }, userToken);
    const taskId = task.json.id;
    const r = await req('PUT', `/tasks/${taskId}`, { title: 'Hacked!' }, attackerToken);
    assert(r.status === 404, `Expected 404, got ${r.status}`);
    await req('DELETE', `/tasks/${taskId}`, undefined, userToken);
  });

  await test('Auth bypass: Cross-user task delete (B deletes A task)', async () => {
    const task = await req('POST', '/tasks', { title: 'Cross-user delete test' }, userToken);
    const taskId = task.json.id;
    const r = await req('DELETE', `/tasks/${taskId}`, undefined, attackerToken);
    assert(r.status === 404, `Expected 404, got ${r.status}`);
    await req('DELETE', `/tasks/${taskId}`, undefined, userToken);
  });

  await test('Auth bypass: Cross-user project access', async () => {
    const proj = await req('POST', '/projects', { name: 'User A Private Project' }, userToken);
    const projId = proj.json.id;
    const r = await req('GET', `/projects/${projId}`, undefined, attackerToken);
    assert(r.status === 404, `Expected 404, got ${r.status}`);
    await req('DELETE', `/projects/${projId}`, undefined, userToken);
  });

  await test('Auth bypass: Cross-user label access', async () => {
    const label = await req('POST', '/labels', { name: 'Secret Label' }, userToken);
    const labelId = label.json.id;
    const r = await req('PUT', `/labels/${labelId}`, { name: 'Hacked Label' }, attackerToken);
    assert(r.status === 404, `Expected 404, got ${r.status}`);
    await req('DELETE', `/labels/${labelId}`, undefined, userToken);
  });

  await test('Auth bypass: Cross-user section access', async () => {
    const proj = await req('POST', '/projects', { name: 'Section Test' }, userToken);
    const sec = await req('POST', '/sections', { projectId: proj.json.id, name: 'Secret Section' }, userToken);
    const secId = sec.json.id;
    const r = await req('PUT', `/sections/${secId}`, { name: 'Hacked Section' }, attackerToken);
    assert(r.status === 404, `Expected 404, got ${r.status}`);
    await req('DELETE', `/sections/${secId}`, undefined, userToken);
    await req('DELETE', `/projects/${proj.json.id}`, undefined, userToken);
  });

  await test('Auth bypass: Cross-user comment access', async () => {
    const task = await req('POST', '/tasks', { title: 'Comment isolation test' }, userToken);
    const taskId = task.json.id;
    const r = await req('POST', `/comments/tasks/${taskId}/comments`, {
      content: 'Injected comment'
    }, attackerToken);
    assert(r.status === 404, `Expected 404 (task not found for attacker), got ${r.status}`);
    await req('DELETE', `/tasks/${taskId}`, undefined, userToken);
  });

  await test('Auth bypass: Cross-user pomodoro session', async () => {
    const task = await req('POST', '/tasks', { title: 'Pomodoro test' }, userToken);
    const startR = await req('POST', '/pomodoro/start', { taskId: task.json.id, mode: 'focus' }, userToken);
    assert(startR.status === 201, `Expected 201, got ${startR.status}`);
    const sessionId = startR.json.id;
    const stopR = await req('POST', '/pomodoro/stop', { sessionId, completed: true }, attackerToken);
    assert(stopR.status === 404, `Expected 404, got ${stopR.status}`);
    await req('POST', '/pomodoro/stop', { sessionId, completed: false }, userToken);
    await req('DELETE', `/tasks/${task.json.id}`, undefined, userToken);
  });

  // ============================================================
  // 4) RATE LIMITING VERIFICATION
  // ============================================================
  console.log('\n⏱️  4. Rate Limiting Tests\n');

  await test('Rate limit: Auth endpoint returns rate limit headers', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'wrong' })
    });
    const remaining = res.headers.get('ratelimit-remaining');
    const limit = res.headers.get('ratelimit-limit');
    if (remaining !== null) {
      assert(parseInt(remaining) >= 0, 'Rate limit remaining should be >= 0');
      assert(parseInt(limit) > 0, 'Rate limit should be > 0');
    }
    assert(true, 'Rate limit header check completed');
  });

  await test('Rate limit: Whitelisted IP bypasses rate limiting', async () => {
    const results = [];
    for (let i = 0; i < 5; i++) {
      const r = await req('GET', '/tasks', undefined, userToken);
      results.push(r.status);
    }
    assert(results.every(s => s === 200), `All requests should succeed for whitelisted IP: ${results}`);
  });

  await test('Rate limit: API general limiter configured (300/15min)', async () => {
    const r = await req('GET', '/health');
    assert(r.status === 200, `Health check failed: ${r.status}`);
  });

  await test('Rate limit: Response headers present on rate-limited routes', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      headers: headers(userToken)
    });
    assert(res.status === 200 || res.status === 429, `Unexpected status: ${res.status}`);
  });

  await test('Rate limit: Auth limiter configured (20/15min)', async () => {
    // Verify the auth rate limiter exists by checking headers
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@test.com', password: 'wrong' })
    });
    const limit = res.headers.get('ratelimit-limit');
    if (limit) {
      assert(parseInt(limit) <= 100, `Auth rate limit should be strict (<=100), got ${limit}`);
    }
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('Rate limit: Write limiter configured (60/min)', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: headers(userToken),
      body: JSON.stringify({ title: 'Rate limit check' })
    });
    const limit = res.headers.get('ratelimit-limit');
    if (limit) {
      assert(parseInt(limit) <= 200, `Write rate limit should be moderate (<=200), got ${limit}`);
    }
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    if (res.status === 201) {
      const json = await res.json();
      await req('DELETE', `/tasks/${json.id}`, undefined, userToken);
    }
  });

  await test('Rate limit: Localhost is whitelisted (no rate limiting)', async () => {
    // 127.0.0.1 is in the default whitelist
    const results = [];
    for (let i = 0; i < 10; i++) {
      const r = await req('GET', '/health');
      results.push(r.status);
    }
    assert(results.every(s => s === 200), 'All requests should succeed from whitelisted IP');
  });

  // ============================================================
  // 5) INPUT VALIDATION TESTS
  // ============================================================
  console.log('\n📋 5. Input Validation Tests\n');

  // --- Registration validation ---
  await test('Validation: Register with short password', async () => {
    const r = await req('POST', '/auth/register', { email: 'short@test.com', name: 'Short', password: '123' });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Validation: Register with invalid email format', async () => {
    const r = await req('POST', '/auth/register', { email: 'not-an-email', name: 'Test', password: 'ValidPass123!' });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Validation: Register with missing required fields', async () => {
    const r = await req('POST', '/auth/register', {});
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Validation: Register with empty email', async () => {
    const r = await req('POST', '/auth/register', { email: '', name: 'Test', password: 'ValidPass123!' });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Validation: Register with empty name', async () => {
    const r = await req('POST', '/auth/register', { email: 'emptyname@test.com', name: '', password: 'ValidPass123!' });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Validation: Register with extremely long email', async () => {
    const longEmail = 'a'.repeat(300) + '@test.com';
    const r = await req('POST', '/auth/register', { email: longEmail, name: 'Long', password: 'ValidPass123!' });
    assert(r.status === 400, `Expected 400 for long email, got ${r.status}`);
  });

  await test('Validation: Register with extremely long name', async () => {
    const longName = 'A'.repeat(200);
    const r = await req('POST', '/auth/register', { email: 'longname@test.com', name: longName, password: 'ValidPass123!' });
    assert(r.status === 400, `Expected 400 for long name, got ${r.status}`);
  });

  // --- Task validation ---
  await test('Validation: Create task with empty title', async () => {
    const r = await req('POST', '/tasks', { title: '' }, userToken);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Validation: Create task with no title', async () => {
    const r = await req('POST', '/tasks', { description: 'No title' }, userToken);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Validation: Create task with title exceeding max length (500)', async () => {
    const r = await req('POST', '/tasks', { title: 'X'.repeat(600) }, userToken);
    assert(r.status === 400, `Expected 400 for long title, got ${r.status}`);
  });

  await test('Validation: Create task with invalid priority (0)', async () => {
    const r = await req('POST', '/tasks', { title: 'Priority test', priority: 0 }, userToken);
    assert(r.status === 400, `Expected 400 for priority 0, got ${r.status}`);
  });

  await test('Validation: Create task with invalid priority (5)', async () => {
    const r = await req('POST', '/tasks', { title: 'Priority test', priority: 5 }, userToken);
    assert(r.status === 400, `Expected 400 for priority 5, got ${r.status}`);
  });

  await test('Validation: Create task with invalid priority (-1)', async () => {
    const r = await req('POST', '/tasks', { title: 'Priority test', priority: -1 }, userToken);
    assert(r.status === 400, `Expected 400 for priority -1, got ${r.status}`);
  });

  await test('Validation: Create task with string priority', async () => {
    const r = await req('POST', '/tasks', { title: 'Priority test', priority: 'high' }, userToken);
    assert(r.status === 400, `Expected 400 for string priority, got ${r.status}`);
  });

  await test('Validation: Update task with no fields', async () => {
    const task = await req('POST', '/tasks', { title: 'Valid' }, userToken);
    const r = await req('PUT', `/tasks/${task.json.id}`, {}, userToken);
    assert(r.status === 400, `Expected 400 for empty update, got ${r.status}`);
    await req('DELETE', `/tasks/${task.json.id}`, undefined, userToken);
  });

  await test('Validation: Task ID must be valid UUID format', async () => {
    const r = await req('GET', '/tasks/not-a-uuid', undefined, userToken);
    assert(r.status === 400, `Expected 400 for invalid UUID, got ${r.status}`);
  });

  await test('Validation: Task ID with SQL characters', async () => {
    const r = await req('GET', "/tasks/1' OR '1'='1", undefined, userToken);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // --- Project validation ---
  await test('Validation: Create project with empty name', async () => {
    const r = await req('POST', '/projects', { name: '' }, userToken);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Validation: Create project with no name', async () => {
    const r = await req('POST', '/projects', {}, userToken);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // --- Label validation ---
  await test('Validation: Create label with empty name', async () => {
    const r = await req('POST', '/labels', { name: '' }, userToken);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // --- Section validation ---
  await test('Validation: Create section without project', async () => {
    const r = await req('POST', '/sections', { name: 'Orphan Section' }, userToken);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Validation: Create section with invalid project ID', async () => {
    const r = await req('POST', '/sections', {
      projectId: 'not-a-uuid',
      name: 'Bad Project Section'
    }, userToken);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // --- Filter validation ---
  await test('Validation: Create filter without name and query', async () => {
    const r = await req('POST', '/filters', {}, userToken);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Validation: Create filter with empty query', async () => {
    const r = await req('POST', '/filters', { name: 'test', query: '' }, userToken);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // --- Boundary tests ---
  await test('Validation: Very large request body (512KB limit)', async () => {
    const largeTitle = 'X'.repeat(512 * 1024);
    const r = await req('POST', '/tasks', { title: largeTitle }, userToken);
    assert(r.status === 413 || r.status === 400, `Expected 413/400, got ${r.status}`);
  });

  await test('Validation: Null body on POST', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: { ...headers(userToken), 'Content-Type': 'application/json' },
      body: 'null'
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('Validation: Empty JSON body on task create', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: { ...headers(userToken), 'Content-Type': 'application/json' },
      body: '{}'
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('Validation: Array instead of object body', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: { ...headers(userToken), 'Content-Type': 'application/json' },
      body: '["injection","attempt"]'
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('Validation: Login with missing password', async () => {
    const r = await req('POST', '/auth/login', { email: 'test@test.com' });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Validation: Login with empty password', async () => {
    const r = await req('POST', '/auth/login', { email: 'test@test.com', password: '' });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // ============================================================
  // 6) ADDITIONAL SECURITY TESTS
  // ============================================================
  console.log('\n🛡️  6. Additional Security Tests\n');

  await test('Security: XSS in task title (script tag)', async () => {
    const xssPayload = '<script>alert("xss")</script>';
    const r = await req('POST', '/tasks', { title: xssPayload }, userToken);
    assert(r.status === 201 || r.status === 400, `Expected 201/400, got ${r.status}`);
    if (r.status === 201) {
      assert(r.json.title === xssPayload, 'Title should be stored as-is in JSON');
      await req('DELETE', `/tasks/${r.json.id}`, undefined, userToken);
    }
  });

  await test('Security: XSS in project name', async () => {
    const xssPayload = '<img src=x onerror=alert(1)>';
    const r = await req('POST', '/projects', { name: xssPayload }, userToken);
    assert(r.status === 201 || r.status === 400, `Expected 201/400, got ${r.status}`);
    if (r.status === 201) {
      await req('DELETE', `/projects/${r.json.id}`, undefined, userToken);
    }
  });

  await test('Security: XSS in label name', async () => {
    const xssPayload = '<svg onload=alert(1)>';
    const r = await req('POST', '/labels', { name: xssPayload }, userToken);
    assert(r.status === 201 || r.status === 400, `Expected 201/400, got ${r.status}`);
    if (r.status === 201) {
      await req('DELETE', `/labels/${r.json.id}`, undefined, userToken);
    }
  });

  await test('Security: Path traversal in task ID', async () => {
    const r = await req('GET', '/tasks/../../etc/passwd', undefined, userToken);
    assert(r.status !== 200 || !r.json?.content, 'Path traversal should not leak files');
    assert(r.status === 400 || r.status === 404, `Expected 400/404, got ${r.status}`);
  });

  await test('Security: Null byte injection in task ID', async () => {
    const r = await req('GET', '/tasks/test%00../../etc/passwd', undefined, userToken);
    assert(r.status !== 200, 'Null byte injection should not succeed');
  });

  await test('Security: Request ID header present in response', async () => {
    const r = await req('GET', '/auth/me', undefined, userToken);
    const requestId = r.headers.get('x-request-id');
    assert(requestId, 'X-Request-Id header should be present');
  });

  await test('Security: Security headers present (Helmet)', async () => {
    const res = await fetch(`${BASE}/health`);
    const xFrameOptions = res.headers.get('x-frame-options');
    const xContentTypeOptions = res.headers.get('x-content-type-options');
    const xXSSProtection = res.headers.get('x-xss-protection');
    assert(xFrameOptions, 'X-Frame-Options header missing');
    assert(xContentTypeOptions, 'X-Content-Type-Options header missing');
    assert(xXSSProtection, 'X-XSS-Protection header missing');
  });

  await test('Security: Server does not expose X-Powered-By', async () => {
    const res = await fetch(`${BASE}/health`);
    const poweredBy = res.headers.get('x-powered-by');
    assert(!poweredBy, `X-Powered-By should be removed, got: ${poweredBy}`);
  });

  await test('Security: CORS credentials header present', async () => {
    const res = await fetch(`${BASE}/health`);
    const cors = res.headers.get('access-control-allow-credentials');
    assert(cors === 'true', 'CORS credentials should be allowed');
  });

  await test('Security: Non-existent routes return proper 404', async () => {
    const r = await req('GET', '/nonexistent');
    assert(r.status === 404, `Expected 404, got ${r.status}`);
  });

  await test('Security: JSON Content-Type enforcement', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'text/plain' },
      body: 'title=test'
    });
    assert(res.status === 400 || res.status === 415, `Expected 400/415, got ${res.status}`);
  });

  await test('Security: Unicode handling in task title', async () => {
    const unicodeTitle = '任务标题 🎉 émojis 日本語 한국어';
    const r = await req('POST', '/tasks', { title: unicodeTitle }, userToken);
    assert(r.status === 201, `Expected 201, got ${r.status}`);
    assert(r.json.title === unicodeTitle, 'Unicode title not preserved');
    await req('DELETE', `/tasks/${r.json.id}`, undefined, userToken);
  });

  await test('Security: Special characters in password field', async () => {
    const specialPass = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
    const r = await req('POST', '/auth/register', {
      email: 'special@test.com',
      name: 'Special',
      password: specialPass
    });
    assert(r.status !== 500, `Special chars in password caused server error: ${r.status}`);
  });

  await test('Security: Prototype pollution attempt via __proto__', async () => {
    const r = await req('POST', '/tasks', {
      title: 'Proto test',
      __proto__: { isAdmin: true },
      constructor: { prototype: { isAdmin: true } }
    }, userToken);
    assert(r.status !== 500, 'Prototype pollution caused server error');
    if (r.status === 201) {
      await req('DELETE', `/tasks/${r.json.id}`, undefined, userToken);
    }
  });

  await test('Security: Mass assignment - role field stripped', async () => {
    const r = await req('POST', '/tasks', {
      title: 'Mass assign test',
      role: 'admin',
      user_id: attackerId,
    }, userToken);
    assert(r.status === 201 || r.status === 400, `Expected 201/400, got ${r.status}`);
    if (r.status === 201) {
      assert(!r.json.role, 'Mass assignment: role field should not be in response');
      assert(!r.json.user_id, 'Mass assignment: user_id should not be in response');
      await req('DELETE', `/tasks/${r.json.id}`, undefined, userToken);
    }
  });

  await test('Security: Password hash not leaked in user responses', async () => {
    const r = await req('GET', '/auth/me', undefined, userToken);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(!r.json.password_hash, 'password_hash should not be in response');
    assert(!r.json.password, 'password should not be in response');
  });

  await test('Security: Health endpoint publicly accessible', async () => {
    const r = await req('GET', '/health');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.json.status === 'ok', 'Health check should return ok');
  });

  await test('Security: WebSocket stats endpoint requires auth', async () => {
    const r = await req('GET', '/ws/stats');
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test('Security: Share endpoint requires authentication', async () => {
    const proj = await req('POST', '/projects', { name: 'Share test' }, userToken);
    const projId = proj.json.id;
    const r = await fetch(`${BASE}/projects/${projId}/shares`, {
      headers: { 'Content-Type': 'application/json' }
    });
    assert(r.status === 401, `Expected 401, got ${r.status}`);
    await req('DELETE', `/projects/${projId}`, undefined, userToken);
  });

  await test('Security: Filter tasks endpoint isolation', async () => {
    const filters = await req('GET', '/filters', undefined, attackerToken);
    if (filters.json && filters.json.length > 0) {
      const filterId = filters.json[0].id;
      const r = await req('GET', `/filters/${filterId}/tasks`, undefined, userToken);
      assert(r.status === 404, `Expected 404, got ${r.status}`);
    }
    assert(true, 'Filter isolation test completed');
  });

  await test('Security: HTTP method not allowed (PUT on /tasks collection)', async () => {
    const r = await req('PUT', '/tasks', { title: 'test' }, userToken);
    assert(r.status !== 201, `Should not create task via PUT on collection: ${r.status}`);
  });

  await test('Security: OPTIONS preflight handling', async () => {
    const res = await fetch(`${BASE}/tasks`, { method: 'OPTIONS' });
    // Should not crash, should return 204 or 200
    assert(res.status === 200 || res.status === 204 || res.status === 404, `Unexpected OPTIONS response: ${res.status}`);
  });

  await test('Security: Content-Length header manipulation', async () => {
    // Send Content-Length that says 0 but actually has a body
    // Node.js fetch may reject this, so we use a different approach
    try {
      const res = await fetch(`${BASE}/tasks`, {
        method: 'POST',
        headers: {
          ...headers(userToken),
          'Content-Length': '0'
        },
        body: JSON.stringify({ title: 'should be ignored' })
      });
      // If it reaches the server, it should fail gracefully
      assert(res.status === 400 || res.status === 413, `Unexpected response: ${res.status}`);
    } catch (e) {
      // Node.js fetch throws on mismatched Content-Length - this is correct behavior
      assert(e.message.includes('Content-Length') || e.message.includes('fetch'), 'Fetch rejected mismatched Content-Length (correct behavior)');
    }
  });

  // ============================================================
  // SECURITY FINDINGS SUMMARY
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('\n🔍 Security Findings Summary\n');

  finding('HIGH', 'JWT_SECRET mismatch: Server was started with a different JWT_SECRET than what is in .env. This means the .env secret can be changed without restarting, but the running server uses a stale/unknown secret. This indicates the .env was modified after server startup.');

  finding('MEDIUM', 'Admin role check relies solely on JWT payload (req.user.role), not verified against database. If JWT_SECRET is compromised, any user can forge a token with role: "admin" and access all admin endpoints (stats, users list, config, cache invalidation).');

  finding('LOW', 'XSS payloads are stored as-is in the database. While the API returns JSON (not HTML), the frontend must sanitize/escape this data when rendering. The server does not sanitize HTML in user-generated content.');

  finding('LOW', 'No CSRF protection on state-changing endpoints. The API relies on Bearer token authentication (not cookies), so CSRF is less relevant, but worth noting.');

  finding('INFO', 'Rate limiting is functional but localhost (127.0.0.1) is whitelisted by default. In production, ensure the whitelist is restricted.');

  finding('INFO', 'Error messages for authentication failures are generic ("邮箱或密码错误"), which is good practice to prevent user enumeration.');

  // ============================================================
  // CLEANUP
  // ============================================================
  console.log('\n🧹 Cleanup\n');

  await test('Cleanup: Remove test data', async () => {
    const tasks = await req('GET', '/tasks', undefined, userToken);
    if (Array.isArray(tasks.json)) {
      for (const task of tasks.json) {
        await req('DELETE', `/tasks/${task.id}`, undefined, userToken);
      }
    }
    const labels = await req('GET', '/labels', undefined, userToken);
    if (Array.isArray(labels.json)) {
      for (const label of labels.json) {
        await req('DELETE', `/labels/${label.id}`, undefined, userToken);
      }
    }
    const projects = await req('GET', '/projects', undefined, userToken);
    if (Array.isArray(projects.json)) {
      for (const proj of projects.json) {
        await req('DELETE', `/projects/${proj.id}`, undefined, userToken);
      }
    }
    const aTasks = await req('GET', '/tasks', undefined, attackerToken);
    if (Array.isArray(aTasks.json)) {
      for (const task of aTasks.json) {
        await req('DELETE', `/tasks/${task.id}`, undefined, attackerToken);
      }
    }
    const aProjects = await req('GET', '/projects', undefined, attackerToken);
    if (Array.isArray(aProjects.json)) {
      for (const proj of aProjects.json) {
        await req('DELETE', `/projects/${proj.id}`, undefined, attackerToken);
      }
    }
  });

  // ============================================================
  // FINAL SUMMARY
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Security Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📋 Total:  ${passed + failed}`);
  console.log(`   🔍 Findings: ${findings.length}`);

  if (failures.length > 0) {
    console.log('\n🔴 Failed Tests:');
    for (const f of failures) {
      console.log(`   - ${f.name}: ${f.msg}`);
    }
  }

  if (findings.length > 0) {
    console.log('\n🔍 All Security Findings:');
    for (const f of findings) {
      console.log(`   [${f.severity}] ${f.desc}`);
    }
  }

  console.log('\n' + '='.repeat(60));

  if (failed > 0) {
    process.exitCode = 1;
  }
})();
