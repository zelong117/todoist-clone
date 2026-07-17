/**
 * 性能监控中间件
 * - 请求耗时统计
 * - 慢查询日志
 * - 内存使用监控
 */

// ============================================================
// 请求耗时统计
// ============================================================
function requestTimer(req, res, next) {
  const startTime = process.hrtime.bigint();
  req._startTime = startTime;

  // 拦截 res.end 以在发送前设置 header 和记录日志
  const originalEnd = res.end;
  res.end = function (...args) {
    const endTime = process.hrtime.bigint();
    const durationNs = Number(endTime - startTime);
    const durationMs = parseFloat((durationNs / 1e6).toFixed(2));

    // 存储到 req 供 collectMetrics 使用
    req._responseTimeMs = durationMs;

    // 在 header 发送前设置（如果还没发送）
    if (!res.headersSent) {
      res.set('X-Response-Time', `${durationMs}ms`);
    }

    // 记录日志
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${durationMs}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user ? req.user.id : 'anonymous',
    };

    // 慢请求警告（> 1000ms）
    if (durationMs > 1000) {
      console.warn(`[SLOW REQUEST] ${JSON.stringify(logData)}`);
    }

    // 错误请求日志
    if (res.statusCode >= 400) {
      console.warn(`[ERROR REQUEST] ${JSON.stringify(logData)}`);
    }

    // 非生产环境记录所有请求
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
    }

    return originalEnd.apply(this, args);
  };

  next();
}

// ============================================================
// 慢查询日志
// ============================================================
const SLOW_QUERY_THRESHOLD_MS = 100; // 100ms

function createSlowQueryWrapper(dbModule) {
  const originalQueryAll = dbModule.queryAll;
  const originalQueryOne = dbModule.queryOne;
  const originalRun = dbModule.run;

  // 包装 queryAll
  dbModule.queryAll = function (sql, params = []) {
    const start = process.hrtime.bigint();
    const result = originalQueryAll.call(this, sql, params);
    const duration = Number(process.hrtime.bigint() - start) / 1e6;

    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`[SLOW QUERY] queryAll: ${duration.toFixed(2)}ms | SQL: ${sql.substring(0, 200)}`);
    }

    return result;
  };

  // 包装 queryOne
  dbModule.queryOne = function (sql, params = []) {
    const start = process.hrtime.bigint();
    const result = originalQueryOne.call(this, sql, params);
    const duration = Number(process.hrtime.bigint() - start) / 1e6;

    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`[SLOW QUERY] queryOne: ${duration.toFixed(2)}ms | SQL: ${sql.substring(0, 200)}`);
    }

    return result;
  };

  // 包装 run
  dbModule.run = function (sql, params = []) {
    const start = process.hrtime.bigint();
    const result = originalRun.call(this, sql, params);
    const duration = Number(process.hrtime.bigint() - start) / 1e6;

    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`[SLOW QUERY] run: ${duration.toFixed(2)}ms | SQL: ${sql.substring(0, 200)}`);
    }

    return result;
  };

  return dbModule;
}

// ============================================================
// 内存使用监控
// ============================================================
function getMemoryUsage() {
  const mem = process.memoryUsage();
  return {
    rss: formatBytes(mem.rss),           // 进程占用的物理内存
    heapTotal: formatBytes(mem.heapTotal), // V8 堆总大小
    heapUsed: formatBytes(mem.heapUsed),   // V8 堆已使用
    external: formatBytes(mem.external),   // C++ 对象内存
    arrayBuffers: formatBytes(mem.arrayBuffers || 0),
    heapUsagePercent: ((mem.heapUsed / mem.heapTotal) * 100).toFixed(2) + '%',
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

// 内存使用警告阈值
const MEMORY_WARN_PERCENT = 95;

function checkMemoryHealth() {
  const mem = process.memoryUsage();
  const heapPercent = (mem.heapUsed / mem.heapTotal) * 100;

  if (heapPercent > MEMORY_WARN_PERCENT) {
    console.warn(`[MEMORY WARNING] 堆内存使用率: ${heapPercent.toFixed(2)}% | ${getMemoryUsage().heapUsed} / ${getMemoryUsage().heapTotal}`);
    return false;
  }
  return true;
}

// 定期内存检查（每 30 秒）
let memoryMonitorInterval = null;
function startMemoryMonitor(intervalMs = 30000) {
  if (memoryMonitorInterval) return;
  memoryMonitorInterval = setInterval(() => {
    checkMemoryHealth();
  }, intervalMs);
  // 不阻止进程退出
  memoryMonitorInterval.unref();
}

function stopMemoryMonitor() {
  if (memoryMonitorInterval) {
    clearInterval(memoryMonitorInterval);
    memoryMonitorInterval = null;
  }
}

// ============================================================
// 请求统计收集（使用 req 上的标记，避免重复包装 res.end）
// ============================================================
const requestMetrics = {
  total: 0,
  byStatus: {},
  byMethod: {},
  slowRequests: 0,
  startTime: Date.now(),
};

function collectMetrics(req, res, next) {
  // 在 requestTimer 之前注册的 finish 回调会在 res.end 中触发
  // 但更安全的做法是在 res.end 包装之前用 finish 事件
  // 这里使用 finish 事件收集指标（不需要设置 header）
  res.on('finish', () => {
    requestMetrics.total++;
    const status = Math.floor(res.statusCode / 100) + 'xx';
    requestMetrics.byStatus[status] = (requestMetrics.byStatus[status] || 0) + 1;
    requestMetrics.byMethod[req.method] = (requestMetrics.byMethod[req.method] || 0) + 1;

    // 从 req 读取 response time（由 requestTimer 设置）
    if (req._responseTimeMs && req._responseTimeMs > 1000) {
      requestMetrics.slowRequests++;
    }
  });
  next();
}

function getMetrics() {
  const uptimeSeconds = Math.floor((Date.now() - requestMetrics.startTime) / 1000);
  return {
    uptime: formatUptime(uptimeSeconds),
    totalRequests: requestMetrics.total,
    requestsPerSecond: uptimeSeconds > 0 ? (requestMetrics.total / uptimeSeconds).toFixed(2) : 0,
    byStatus: requestMetrics.byStatus,
    byMethod: requestMetrics.byMethod,
    slowRequests: requestMetrics.slowRequests,
    memory: getMemoryUsage(),
  };
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}天`);
  if (h > 0) parts.push(`${h}小时`);
  if (m > 0) parts.push(`${m}分钟`);
  parts.push(`${s}秒`);
  return parts.join('');
}

module.exports = {
  requestTimer,
  createSlowQueryWrapper,
  getMemoryUsage,
  checkMemoryHealth,
  startMemoryMonitor,
  stopMemoryMonitor,
  collectMetrics,
  getMetrics,
};
