/**
 * 压力测试 - 模拟并发用户
 * 用法: node stress-test.js [并发数] [请求数]
 */
const BASE = 'http://localhost:3001/api';
const CONCURRENCY = parseInt(process.argv[2] || '20');
const REQUESTS = parseInt(process.argv[3] || '100');

let successCount = 0;
let errorCount = 0;
let totalLatency = 0;
let maxLatency = 0;
let minLatency = Infinity;

function log(msg) { process.stdout.write(msg); }

async function makeRequest(method, path, body, headers = {}) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const latency = Date.now() - start;
    totalLatency += latency;
    maxLatency = Math.max(maxLatency, latency);
    minLatency = Math.min(minLatency, latency);
    if (res.ok || res.status === 401 || res.status === 400 || res.status === 404 || res.status === 403) {
      successCount++;
    } else {
      errorCount++;
      log(`\n  ❌ ${method} ${path} -> ${res.status}`);
    }
  } catch (err) {
    errorCount++;
    log(`\n  ❌ ${method} ${path} -> ${err.message}`);
  }
}

async function userSession(userId) {
  // 注册
  const email = `stress_${userId}_${Date.now()}@test.com`;
  await makeRequest('POST', '/auth/register', { email, name: `User${userId}`, password: 'passw0rd!' });
  
  // 登录
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'passw0rd!' }),
  });
  const loginData = await loginRes.json().catch(() => ({}));
  const token = loginData.token;
  if (!token) return;
  
  const auth = { Authorization: `Bearer ${token}` };
  
  // 批量请求
  for (let i = 0; i < Math.ceil(REQUESTS / CONCURRENCY); i++) {
    const action = Math.random();
    if (action < 0.3) {
      await makeRequest('GET', '/tasks', null, auth);
    } else if (action < 0.5) {
      await makeRequest('POST', '/tasks', { title: `Task ${i} from user ${userId}` }, auth);
    } else if (action < 0.7) {
      await makeRequest('GET', '/projects', null, auth);
    } else if (action < 0.85) {
      await makeRequest('GET', '/labels', null, auth);
    } else {
      await makeRequest('GET', '/auth/me', null, auth);
    }
  }
}

async function run() {
  console.log(`\n🚀 压力测试: ${CONCURRENCY} 并发用户, 每用户 ${Math.ceil(REQUESTS / CONCURRENCY)} 请求\n`);
  
  const start = Date.now();
  const users = Array.from({ length: CONCURRENCY }, (_, i) => userSession(i));
  await Promise.all(users);
  const elapsed = Date.now() - start;
  
  const totalRequests = successCount + errorCount;
  const avgLatency = totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0;
  const rps = totalRequests > 0 ? Math.round(totalRequests / (elapsed / 1000)) : 0;
  
  console.log(`\n📊 测试结果:`);
  console.log(`  总请求: ${totalRequests}`);
  console.log(`  成功: ${successCount} (${Math.round(successCount / totalRequests * 100)}%)`);
  console.log(`  失败: ${errorCount}`);
  console.log(`  总耗时: ${elapsed}ms`);
  console.log(`  吞吐量: ${rps} req/s`);
  console.log(`  延迟: min=${minLatency}ms avg=${avgLatency}ms max=${maxLatency}ms`);
  
  // 检查内存
  const health = await fetch(`${BASE}/health`).then(r => r.json()).catch(() => ({}));
  if (health.memory) {
    console.log(`\n  内存: RSS=${health.memory.rss} Heap=${health.memory.heapUsed} (${health.memory.heapUsagePercent}%)`);
  }
  
  console.log(`\n✨ 压力测试完成`);
}

run().catch(console.error);
