/**
 * 最小 API 回归测试
 * 运行方式：node test/api.test.js
 * 需要后端先启动在 3001 端口
 */

const BASE = 'http://localhost:3001/api';

let userA_token, userA_id;
let userB_token, userB_id;
let taskId;
let projectA_id, sectionA_id, sectionTask_id;

const headers = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
  } catch (e) {
    console.error(`  ❌ ${name}: ${e.message}`);
    process.exitCode = 1;
  }
}

async function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

// ============================================================
console.log('\n🧪 API 回归测试\n');
// ============================================================

// --- 注册 ---
console.log('注册:');
await test('用户A注册（或登录）', async () => {
  let res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email: 'testA@test.com', name: 'TestA', password: 'password123' }),
  });
  let data = await res.json();
  if (!res.ok && data.error === '该邮箱已被注册') {
    res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email: 'testA@test.com', password: 'password123' }),
    });
    data = await res.json();
  }
  await assert(res.ok, `注册/登录失败: ${JSON.stringify(data)}`);
  await assert(data.token, '没有返回 token');
  userA_token = data.token;
  userA_id = data.user.id;
});

await test('用户B注册（或登录）', async () => {
  let res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email: 'testB@test.com', name: 'TestB', password: 'password123' }),
  });
  let data = await res.json();
  if (!res.ok && data.error === '该邮箱已被注册') {
    res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email: 'testB@test.com', password: 'password123' }),
    });
    data = await res.json();
  }
  await assert(res.ok, `注册/登录失败: ${JSON.stringify(data)}`);
  userB_token = data.token;
  userB_id = data.user.id;
});

await test('重复注册被拒绝', async () => {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email: 'testA@test.com', name: 'TestA', password: 'password123' }),
  });
  await assert(!res.ok, '重复注册应该失败');
});

// --- 登录 ---
console.log('\n登录:');
await test('用户A登录', async () => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email: 'testA@test.com', password: 'password123' }),
  });
  const data = await res.json();
  await assert(res.ok, `登录失败: ${JSON.stringify(data)}`);
  await assert(data.token, '没有返回 token');
});

await test('错误密码被拒绝', async () => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email: 'testA@test.com', password: 'wrongpassword' }),
  });
  await assert(!res.ok, '错误密码应该失败');
});

// --- /me ---
console.log('\n/me:');
await test('获取当前用户', async () => {
  const res = await fetch(`${BASE}/auth/me`, { headers: headers(userA_token) });
  const data = await res.json();
  await assert(res.ok, `获取失败: ${JSON.stringify(data)}`);
  await assert(data.email === 'testa@test.com', `邮箱不匹配: ${data.email}`);
});

await test('无 token 被拒绝', async () => {
  const res = await fetch(`${BASE}/auth/me`);
  await assert(!res.status === 401 || !res.ok, '无 token 应该返回 401');
});

// --- 任务 CRUD ---
console.log('\n任务 CRUD:');
await test('创建任务', async () => {
  const res = await fetch(`${BASE}/tasks`, {
    method: 'POST',
    headers: headers(userA_token),
    body: JSON.stringify({ title: 'Test Task A', priority: 2 }),
  });
  const data = await res.json();
  await assert(res.ok, `创建失败: ${JSON.stringify(data)}`);
  await assert(data.id, '没有返回任务 ID');
  await assert(data.title === 'Test Task A', `标题不匹配: ${data.title}`);
  taskId = data.id;
});

await test('获取任务列表', async () => {
  const res = await fetch(`${BASE}/tasks`, { headers: headers(userA_token) });
  const data = await res.json();
  await assert(res.ok, `获取失败: ${JSON.stringify(data)}`);
  await assert(Array.isArray(data), '返回不是数组');
  await assert(data.length >= 1, `任务数量不对: ${data.length}`);
});

await test('更新任务', async () => {
  const res = await fetch(`${BASE}/tasks/${taskId}`, {
    method: 'PUT',
    headers: headers(userA_token),
    body: JSON.stringify({ title: 'Updated Task A' }),
  });
  const data = await res.json();
  await assert(res.ok, `更新失败: ${JSON.stringify(data)}`);
});

await test('完成任务', async () => {
  const res = await fetch(`${BASE}/tasks/${taskId}/complete`, {
    method: 'POST',
    headers: headers(userA_token),
  });
  await assert(res.ok, `完成失败: ${res.status}`);
});

await test('删除任务', async () => {
  const res = await fetch(`${BASE}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: headers(userA_token),
  });
  await assert(res.ok, `删除失败: ${res.status}`);
});

// --- 版块与任务归属 ---
console.log('\n版块同步:');
await test('用户A创建项目和版块', async () => {
  let res = await fetch(`${BASE}/projects`, { method: 'POST', headers: headers(userA_token), body: JSON.stringify({ name: 'Section Test Project' }) });
  let data = await res.json();
  await assert(res.ok, `创建项目失败: ${JSON.stringify(data)}`);
  projectA_id = data.id;
  res = await fetch(`${BASE}/sections`, { method: 'POST', headers: headers(userA_token), body: JSON.stringify({ projectId: projectA_id, name: 'Test Section', order: 0 }) });
  data = await res.json();
  await assert(res.ok, `创建版块失败: ${JSON.stringify(data)}`);
  sectionA_id = data.id;
});

await test('版块任务保存描述和上下文', async () => {
  const res = await fetch(`${BASE}/tasks`, { method: 'POST', headers: headers(userA_token), body: JSON.stringify({ title: 'Section Task', description: 'Saved description', projectId: projectA_id, sectionId: sectionA_id, labels: ['工作'] }) });
  const data = await res.json();
  await assert(res.ok, `创建版块任务失败: ${JSON.stringify(data)}`);
  await assert(data.sectionId === sectionA_id && data.projectId === projectA_id, '任务版块上下文丢失');
  await assert(data.description === 'Saved description', '任务描述未保存');
  sectionTask_id = data.id;
});

await test('用户B不能使用用户A的版块', async () => {
  const res = await fetch(`${BASE}/tasks`, { method: 'POST', headers: headers(userB_token), body: JSON.stringify({ title: 'Cross User Section', projectId: projectA_id, sectionId: sectionA_id }) });
  await assert(res.status === 400 || res.status === 403 || res.status === 404, `跨用户版块写入未被拒绝: ${res.status}`);
});

await test('版块列表按用户隔离', async () => {
  const res = await fetch(`${BASE}/sections`, { headers: headers(userB_token) });
  const data = await res.json();
  await assert(res.ok, `获取版块失败: ${JSON.stringify(data)}`);
  await assert(!data.some((section) => section.id === sectionA_id), '用户B看到了用户A的版块');
});

// --- 跨用户隔离 ---
console.log('\n跨用户隔离:');
let taskB_id;
await test('用户B创建任务', async () => {
  const res = await fetch(`${BASE}/tasks`, {
    method: 'POST',
    headers: headers(userB_token),
    body: JSON.stringify({ title: 'Task B Private' }),
  });
  const data = await res.json();
  await assert(res.ok, `创建失败: ${JSON.stringify(data)}`);
  taskB_id = data.id;
});

await test('用户A看不到用户B的任务', async () => {
  const res = await fetch(`${BASE}/tasks`, { headers: headers(userA_token) });
  const data = await res.json();
  await assert(res.ok, `获取失败: ${JSON.stringify(data)}`);
  const found = data.find((t) => t.id === taskB_id);
  await assert(!found, '用户A不应该看到用户B的任务');
});

await test('用户A不能删除用户B的任务', async () => {
  const res = await fetch(`${BASE}/tasks/${taskB_id}`, {
    method: 'DELETE',
    headers: headers(userA_token),
  });
  // 应该返回 404 或 403
  await assert(!res.ok || res.status === 404 || res.status === 403, '应该被拒绝');
});

// --- 管理员路由 ---
console.log('\n管理员路由:');
await test('普通用户不能访问管理员路由', async () => {
  const res = await fetch(`${BASE}/admin/stats`, { headers: headers(userA_token) });
  // 应该返回 403
  await assert(res.status === 403 || !res.ok, '普通用户应该被拒绝');
});

// --- 清理 ---
console.log('\n清理:');
await test('删除测试数据', async () => {
  // 删除用户B的任务
  if (taskB_id) {
    await fetch(`${BASE}/tasks/${taskB_id}`, {
      method: 'DELETE',
      headers: headers(userB_token),
    });
  }
  if (sectionTask_id) await fetch(`${BASE}/tasks/${sectionTask_id}`, { method: 'DELETE', headers: headers(userA_token) });
  if (sectionA_id) await fetch(`${BASE}/sections/${sectionA_id}`, { method: 'DELETE', headers: headers(userA_token) });
  if (projectA_id) await fetch(`${BASE}/projects/${projectA_id}`, { method: 'DELETE', headers: headers(userA_token) });
});

console.log('\n✨ 测试完成\n');
