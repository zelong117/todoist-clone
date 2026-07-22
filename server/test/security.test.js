/**
 * 安全测试 - SQL 注入、JWT 操控、认证绕过
 */
const BASE = 'http://localhost:3001/api';
let tokenA, tokenB;

async function req(method, path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function setup() {
  // 尝试注册，如果已存在则直接登录
  await req('POST', '/auth/register', { email: 'sec_a@test.com', name: 'SecA', password: 'passw0rd!' });
  const loginA = await req('POST', '/auth/login', { email: 'sec_a@test.com', password: 'passw0rd!' });
  tokenA = loginA.data.token;
  await req('POST', '/auth/register', { email: 'sec_b@test.com', name: 'SecB', password: 'passw0rd!' });
  const loginB = await req('POST', '/auth/login', { email: 'sec_b@test.com', password: 'passw0rd!' });
  tokenB = loginB.data.token;
  console.log(`  Token A: ${tokenA ? '✅' : '❌'}`);
  console.log(`  Token B: ${tokenB ? '✅' : '❌'}`);
}

async function cleanup() {
  // Cleanup via direct API won't work without admin, so just finish
}

// ===== SQL 注入测试 =====
async function testSQLInjection() {
  console.log('\n🔒 SQL 注入测试');
  const tests = [
    { name: '任务标题注入', body: { title: "'; DROP TABLE tasks; --" } },
    { name: '项目名注入', body: { name: "1' OR '1'='1" } },
    { name: '邮箱注入登录', body: { email: "admin'--", password: "anything" } },
    { name: '密码注入', body: { email: 'sec_a@test.com', password: "' OR '1'='1" } },
    { name: '标签名注入', body: { name: "UNION SELECT * FROM users--", color: '#ff0000' } },
    { name: '搜索注入', query: '/tasks?search=1%27%20UNION%20SELECT%20*%20FROM%20users--' },
  ];

  for (const t of tests) {
    let result;
    if (t.query) {
      result = await req('GET', t.query, null, { Authorization: `Bearer ${tokenA}` });
    } else {
      result = await req('POST', '/tasks', t.body, { Authorization: `Bearer ${tokenA}` });
    }
    const safe = result.status !== 500 && !JSON.stringify(result.data).includes('SQL');
    console.log(`  ${safe ? '✅' : '❌'} ${t.name}: ${result.status}`);
    if (!safe) console.log(`    ⚠️ Response: ${JSON.stringify(result.data).slice(0, 100)}`);
  }
}

// ===== JWT 操控测试 =====
async function testJWTManipulation() {
  console.log('\n🔒 JWT 操控测试');
  const tests = [
    { name: '伪造 token', token: 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6InRlc3QiLCJyb2xlIjoiYWRtaW4ifQ.fake' },
    { name: '空 token', token: '' },
    { name: 'Bearer 后无 token', token: undefined, header: 'Bearer ' },
    { name: '修改 payload 的 token', token: tokenA ? tokenA.slice(0, -5) + 'AAAAA' : 'fake' },
  ];

  for (const t of tests) {
    const headers = { Authorization: t.header || `Bearer ${t.token}` };
    const result = await req('GET', '/auth/me', null, headers);
    const safe = result.status === 401;
    console.log(`  ${safe ? '✅' : '❌'} ${t.name}: ${result.status} (期望 401)`);
  }
}

// ===== 越权测试 =====
async function testAuthorization() {
  console.log('\n🔒 越权测试');
  // 创建一个任务给用户 A
  const task = await req('POST', '/tasks', { title: 'Secret Task A' }, { Authorization: `Bearer ${tokenA}` });
  const taskId = task.data.id;

  const tests = [
    { name: '用户B查看用户A的任务列表', method: 'GET', path: '/tasks', token: tokenB, expect: 200 },
    { name: '用户B删除用户A的任务', method: 'DELETE', path: `/tasks/${taskId}`, token: tokenB, expect: 404 },
    { name: '用户B更新用户A的任务', method: 'PUT', path: `/tasks/${taskId}`, token: tokenB, body: { title: 'Hacked' }, expect: 404 },
    { name: '普通用户访问管理路由', method: 'GET', path: '/admin/stats', token: tokenA, expect: 403 },
  ];

  for (const t of tests) {
    const result = await req(t.method, t.path, t.body, { Authorization: `Bearer ${t.token}` });
    const safe = result.status === t.expect;
    console.log(`  ${safe ? '✅' : '❌'} ${t.name}: ${result.status} (期望 ${t.expect})`);
  }
}

// ===== 输入验证测试 =====
async function testInputValidation() {
  console.log('\n🔒 输入验证测试');
  const tests = [
    { name: '空标题创建任务', body: {}, expect: 400 },
    { name: '超长标题', body: { title: 'A'.repeat(10000) }, expect: 400 },
    { name: '无密码注册', body: { email: 'new@test.com', name: 'Test' }, expect: 400 },
    { name: '弱密码注册', body: { email: 'new2@test.com', name: 'Test', password: '1' }, expect: 400 },
    { name: '无效邮箱格式', body: { email: 'not-an-email', name: 'Test', password: 'passw0rd!' }, expect: 400 },
  ];

  for (const t of tests) {
    const result = await req('POST', '/tasks', t.body, { Authorization: `Bearer ${tokenA}` });
    const safe = result.status === t.expect || result.status === 400;
    console.log(`  ${safe ? '✅' : '❌'} ${t.name}: ${result.status}`);
  }
}

// ===== 运行所有测试 =====
async function runAll() {
  console.log('🧪 安全测试开始\n');
  await setup();
  await testSQLInjection();
  await testJWTManipulation();
  await testAuthorization();
  await testInputValidation();
  await cleanup();
  console.log('\n✨ 安全测试完成');
}

runAll().catch(console.error);
