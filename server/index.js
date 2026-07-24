// 鉁?Load .env FIRST before anything else
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { initDB } = require('./db');

// ============================================================
// 瀵煎叆涓棿浠?
// ============================================================
const { helmetConfig, corsOptions, extraSecurityHeaders, requestBodyGuard } = require('./middleware/security');
const { ipFilter, apiLimiter, authLimiter, writeLimiter, adminLimiter } = require('./middleware/rateLimiter');
const { getCacheStats, invalidateByUser } = require('./middleware/cache');
const { requestTimer, collectMetrics, getMetrics, getMemoryUsage, startMemoryMonitor, createSlowQueryWrapper } = require('./middleware/performance');
const { checkProjectQuota, checkAiQuota } = require('./middleware/quota');

// ============================================================
// WebSocket 妯″潡
// ============================================================
const WebSocketManager = require('./websocket');
const NotificationService = require('./websocket/notificationService');
const MessageQueue = require('./websocket/messageQueue');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// 瀹夊叏涓棿浠讹紙鏈€澶栧眰锛?
// ============================================================
app.use(helmetConfig);                    // Helmet 瀹夊叏澶?
app.use(cors(corsOptions));               // CORS 閰嶇疆
app.use(extraSecurityHeaders);            // 棰濆瀹夊叏澶?+ Request ID
app.use(express.json({ limit: '512kb' })); // 璇锋眰浣撳ぇ灏忛檺鍒讹紙浠?1MB 闄嶅埌 512KB锛?
app.use(requestBodyGuard(512 * 1024));    // 鍙岄噸妫€鏌ヨ姹備綋澶у皬
app.use(ipFilter);                        // IP 榛戝悕鍗曡繃婊?

// ============================================================
// 鎬ц兘鐩戞帶
// ============================================================
app.use(requestTimer);                    // 璇锋眰鑰楁椂缁熻
app.use(collectMetrics);                  // 璇锋眰鎸囨爣鏀堕泦

// ============================================================
// WebSocket 鍗曚緥娉ㄥ叆鍒?app.locals锛堜緵璺敱浣跨敤锛?
// ============================================================
const notificationService = new NotificationService();
const messageQueue = new MessageQueue();
const wsManager = new WebSocketManager();

app.locals.wsManager = wsManager;
app.locals.notificationService = notificationService;
app.locals.messageQueue = messageQueue;

// ============================================================
// 閫氱敤 API 闄愭祦
// ============================================================
app.use('/api', apiLimiter);

// ============================================================
// 璺敱娉ㄥ唽锛堝甫鐙珛闄愭祦鍜岀紦瀛橈級
// ============================================================

// 璁よ瘉璺敱 - 涓ユ牸闄愭祦锛屾棤缂撳瓨
app.use('/api/auth', authLimiter, require('./routes/auth'));

// 椤圭洰璺敱 - 鍐欐搷浣滈檺娴?+ 璇荤紦瀛?
app.use('/api/projects', (req, res, next) => req.method === 'GET' ? next() : writeLimiter(req, res, next), (req, res, next) => req.method === 'POST' ? checkProjectQuota(req, res, next) : next(), require('./routes/projects'));

// 浠诲姟璺敱 - 鍐欐搷浣滈檺娴?+ 璇荤紦瀛橈紙鏇寸煭 TTL锛屽洜涓轰换鍔″彉鍖栭绻侊級
app.use('/api/tasks', (req, res, next) => req.method === 'GET' ? next() : writeLimiter(req, res, next), require('./routes/tasks'));

// 鏍囩璺敱 - 鍐欐搷浣滈檺娴?+ 璇荤紦瀛?
app.use('/api/labels', (req, res, next) => req.method === 'GET' ? next() : writeLimiter(req, res, next), require('./routes/labels'));
app.use('/api/sections', (req, res, next) => req.method === 'GET' ? next() : writeLimiter(req, res, next), require('./routes/sections'));

app.use('/api/filters', writeLimiter, require('./routes/filters'));
app.use('/api/notifications', writeLimiter, require('./routes/notifications'));
app.use('/api/insights', require('./routes/insights'));


// 璇勮璺敱 - 鍐欐搷浣滈檺娴?
app.use('/api/comments', writeLimiter, require('./routes/comments'));

// 鐣寗閽熻矾鐢?- 鍐欐搷浣滈檺娴?
app.use('/api/pomodoro', writeLimiter, require('./routes/pomodoro'));

// 绠＄悊鍛樿矾鐢?- 绠＄悊鍛橀檺娴?
app.use('/api/admin', adminLimiter, require('./routes/admin'));
app.use('/api/ai', checkAiQuota, require('./routes/ai'));
console.log('[AI] AI route registered at /api/ai');

// 项目共享路由
app.use('/api/projects', require('./routes/shares'));

// 用户路由（头像/设置）
app.use('/api/users', require('./routes/users'));

// 附件路由
app.use('/api', require('./routes/attachments'));

// 静态文件（上传的头像/附件）
app.use('/api/uploads', express.static(path.join(__dirname, 'data', 'uploads')));
app.use('/api/attachments/file', express.static(path.join(__dirname, 'data', 'attachments')));

// OAuth 路由
app.use('/api/auth', require('./routes/oauth'));

// 团队路由
app.use('/api/teams', require('./routes/teams'));

// 审计日志路由
app.use('/api/audit-logs', require('./routes/auditLogs'));

// API 文档
app.use('/api/docs', require('./routes/docs'));

// ============================================================
// 鍋ュ悍妫€鏌ュ拰鐩戞帶绔偣
// ============================================================

// ============================================================
// Backend Dashboard Home Page
// ============================================================
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaskFlow - Backend Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
    .header { text-align: center; margin-bottom: 48px; }
    .logo { display: inline-flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .logo-icon { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #ef4444, #f97316); display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; font-weight: bold; }
    .logo-text { font-size: 28px; font-weight: 700; color: #fff; }
    .subtitle { color: #94a3b8; font-size: 14px; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: #065f46; color: #6ee7b7; border-radius: 999px; font-size: 13px; font-weight: 500; margin-top: 16px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #34d399; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 40px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 24px; transition: all 0.2s; }
    .card:hover { border-color: #475569; transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
    .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .card-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .card-title { font-size: 16px; font-weight: 600; color: #f1f5f9; }
    .card-desc { font-size: 13px; color: #94a3b8; line-height: 1.6; }
    .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #1e293b; }
    .stat-row:last-child { border-bottom: none; }
    .stat-label { font-size: 13px; color: #94a3b8; }
    .stat-value { font-size: 14px; font-weight: 600; color: #f1f5f9; }
    .api-list { list-style: none; }
    .api-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; margin-bottom: 6px; background: #0f172a; border-radius: 8px; font-size: 13px; font-family: 'SF Mono', monospace; }
    .method { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; min-width: 50px; text-align: center; }
    .method-get { background: #1e3a5f; color: #60a5fa; }
    .method-post { background: #1a3a2a; color: #4ade80; }
    .method-put { background: #3a2a1a; color: #fbbf24; }
    .method-delete { background: #3a1a1a; color: #f87171; }
    .api-path { color: #cbd5e1; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 500; text-decoration: none; transition: all 0.2s; }
    .btn-primary { background: linear-gradient(135deg, #ef4444, #f97316); color: white; }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn-secondary { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; }
    .btn-secondary:hover { background: #334155; }
    .footer { text-align: center; padding: 32px 0; color: #475569; font-size: 12px; border-top: 1px solid #1e293b; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <div class="logo-icon">T</div>
        <span class="logo-text">TaskFlow</span>
      </div>
      <p class="subtitle">Commercial-Grade Task Management SaaS</p>
      <div class="status-badge">
        <span class="status-dot"></span>
        Backend Online
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-header">
          <div class="card-icon" style="background: #1e3a5f;">🚀</div>
          <span class="card-title">Quick Start</span>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <a href="http://localhost:5174" class="btn btn-primary">Open Frontend →</a>
          <a href="/api/health" class="btn btn-secondary">Health Check</a>
        </div>
      </div>

      <div class="card" id="stats-card">
        <div class="card-header">
          <div class="card-icon" style="background: #1a3a2a;">📊</div>
          <span class="card-title">System Status</span>
        </div>
        <div id="stats-content">
          <div class="stat-row"><span class="stat-label">Loading...</span></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-icon" style="background: #3a2a1a;">🔌</div>
          <span class="card-title">WebSocket</span>
        </div>
        <div class="stat-row"><span class="stat-label">Endpoint</span><span class="stat-value">ws://localhost:3001/ws</span></div>
        <div class="stat-row"><span class="stat-label">Protocol</span><span class="stat-value">JWT Auth</span></div>
        <div class="stat-row"><span class="stat-label">Heartbeat</span><span class="stat-value">30s interval</span></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-icon" style="background: #1a2a3a;">📡</div>
        <span class="card-title">API Endpoints</span>
      </div>
      <ul class="api-list">
        <li class="api-item"><span class="method method-post">POST</span><span class="api-path">/api/auth/register</span><span style="color:#64748b;font-size:11px;margin-left:auto;">注册</span></li>
        <li class="api-item"><span class="method method-post">POST</span><span class="api-path">/api/auth/login</span><span style="color:#64748b;font-size:11px;margin-left:auto;">登录</span></li>
        <li class="api-item"><span class="method method-post">POST</span><span class="api-path">/api/auth/refresh</span><span style="color:#64748b;font-size:11px;margin-left:auto;">刷新 Token</span></li>
        <li class="api-item"><span class="method method-get">GET</span><span class="api-path">/api/auth/me</span><span style="color:#64748b;font-size:11px;margin-left:auto;">当前用户</span></li>
        <li class="api-item"><span class="method method-get">GET</span><span class="api-path">/api/tasks</span><span style="color:#64748b;font-size:11px;margin-left:auto;">任务列表</span></li>
        <li class="api-item"><span class="method method-post">POST</span><span class="api-path">/api/tasks</span><span style="color:#64748b;font-size:11px;margin-left:auto;">创建任务</span></li>
        <li class="api-item"><span class="method method-get">GET</span><span class="api-path">/api/projects</span><span style="color:#64748b;font-size:11px;margin-left:auto;">项目列表</span></li>
        <li class="api-item"><span class="method method-post">POST</span><span class="api-path">/api/projects</span><span style="color:#64748b;font-size:11px;margin-left:auto;">创建项目</span></li>
        <li class="api-item"><span class="method method-get">GET</span><span class="api-path">/api/labels</span><span style="color:#64748b;font-size:11px;margin-left:auto;">标签列表</span></li>
        <li class="api-item"><span class="method method-post">POST</span><span class="api-path">/api/ai/analyze</span><span style="color:#64748b;font-size:11px;margin-left:auto;">AI 分析</span></li>
        <li class="api-item"><span class="method method-get">GET</span><span class="api-path">/api/health</span><span style="color:#64748b;font-size:11px;margin-left:auto;">健康检查</span></li>
      </ul>
    </div>

    <div class="footer">
      <p>TaskFlow Backend v1.0 · Express + SQLite + WebSocket</p>
      <p style="margin-top: 4px;">Powered by Node.js · Built for Production</p>
    </div>
  </div>

  <script>
    fetch('/api/health').then(r => r.json()).then(data => {
      const el = document.getElementById('stats-content');
      el.innerHTML = \`
        <div class="stat-row"><span class="stat-label">Status</span><span class="stat-value" style="color:#34d399">\${data.status}</span></div>
        <div class="stat-row"><span class="stat-label">Memory (RSS)</span><span class="stat-value">\${Math.round(data.memory.rss / 1024 / 1024)} MB</span></div>
        <div class="stat-row"><span class="stat-label">Heap Used</span><span class="stat-value">\${Math.round(data.memory.heapUsed / 1024 / 1024)} MB</span></div>
        <div class="stat-row"><span class="stat-label">Uptime</span><span class="stat-value">\${Math.round(process.uptime || 0)}s</span></div>
        <div class="stat-row"><span class="stat-label">Online Users</span><span class="stat-value">\${data.ws.onlineUsers}</span></div>
      \`;
    }).catch(() => {
      document.getElementById('stats-content').innerHTML = '<div class="stat-row"><span class="stat-label" style="color:#f87171">Connection failed</span></div>';
    });
  </script>
</body>
</html>`);
});


app.get('/api/health', (req, res) => {
  const memory = getMemoryUsage();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    memory,
    ws: {
      onlineUsers: wsManager.getOnlineCount(),
    },
  });
});

// WebSocket 鐘舵€佺鐐?
app.get('/api/ws/stats',
  require('./middleware/auth').authenticate,
  (req, res) => {
    res.json(wsManager.getStats());
  }
);

// 鎬ц兘鎸囨爣绔偣锛堜粎绠＄悊鍛橈級
app.get('/api/admin/metrics',
  require('./middleware/auth').authenticate,
  require('./middleware/auth').requireAdmin,
  (req, res) => {
    res.json({
      metrics: getMetrics(),
      cache: getCacheStats(),
    });
  }
);

// 缂撳瓨绠＄悊绔偣锛堜粎绠＄悊鍛橈級
app.post('/api/admin/cache/invalidate',
  require('./middleware/auth').authenticate,
  require('./middleware/auth').requireAdmin,
  (req, res) => {
    const { tag, userId } = req.body;
    if (tag) {
      const { invalidateByTag } = require('./middleware/cache');
      invalidateByTag(tag);
      res.json({ success: true, message: `Invalidated cache tag "${tag}"` });
    } else if (userId) {
      invalidateByUser(userId);
      res.json({ success: true, message: `Invalidated cache for user "${userId}"` });
    } else {
      const { invalidateAll } = require('./middleware/cache');
      invalidateAll();
      res.json({ success: true, message: 'Invalidated all cache' });
    }
  }
);

// ============================================================
// 闈欐€佹枃浠跺拰 404
// ============================================================
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'dist', 'index.html')));
}

// 缁熶竴鐨?404 鍜岄敊璇鐞嗕腑闂翠欢
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================
// 鎴鏃ユ湡鎻愰啋妫€鏌ワ紙姣?5 鍒嗛挓锛?
// ============================================================
const DEADLINE_CHECK_INTERVAL = 5 * 60 * 1000;

function checkDeadlines() {
  try {
    const { queryAll } = require('./db');
    const now = new Date();
    const in30Min = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const nowISO = now.toISOString();

    // 鏌ユ壘 30 鍒嗛挓鍐呭埌鏈熶笖鏈畬鎴愮殑浠诲姟
    const dueSoon = queryAll(
      'SELECT * FROM tasks WHERE is_completed = 0 AND due_date IS NOT NULL AND due_date <= ? AND due_date >= ?',
      [in30Min, nowISO]
    );

    for (const task of dueSoon) {
      notificationService.notify(
        task.user_id,
        'deadline:due',
        {
          taskId: task.id,
          title: task.title,
          dueDate: task.due_date,
          projectId: task.project_id,
          priority: task.priority,
          message: `Task "${task.title}" is due within 30 minutes`,
        },
        wsManager,
        messageQueue
      );
    }
  } catch (err) {
    console.error('[Deadline] Check error:', err.message);
  }
}

// ============================================================
// 鍚姩鏈嶅姟鍣?
// ============================================================
initDB().then(() => {
  // 鍖呰鏁版嵁搴撴ā鍧椾互娣诲姞鎱㈡煡璇㈡棩蹇?
  createSlowQueryWrapper(require('./db'));

  // 鍚姩鍐呭瓨鐩戞帶
  startMemoryMonitor(30000);

  // 鍒涘缓 HTTP 鏈嶅姟鍣紙鐢ㄤ簬 WebSocket 鍗囩骇锛?
  const server = http.createServer(app);

  // 鍒濆鍖?WebSocket 鏈嶅姟鍣?
  wsManager.init(server, notificationService, messageQueue);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`WebSocket available at ws://0.0.0.0:${PORT}/ws`);
    console.log(`Memory: ${JSON.stringify(getMemoryUsage())}`);
    console.log(`Security: Helmet, CORS, Rate Limiting enabled`);

    // 启动截止日期提醒定时器
    setInterval(checkDeadlines, DEADLINE_CHECK_INTERVAL);
    // 启动时立即检查一次
    checkDeadlines();
  });

  // 浼橀泤鍏抽棴
  const gracefulShutdown = () => {
    console.log('\n馃洃 Shutting down gracefully...');
    wsManager.close();
    server.close(() => {
      console.log('鉁?Server closed');
      process.exit(0);
    });
    // 5 绉掑悗寮哄埗閫€鍑?
    setTimeout(() => process.exit(1), 5000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err);
    gracefulShutdown();
  });
}).catch(err => {
  console.error('Failed to init database:', err);
  process.exit(1);
});

