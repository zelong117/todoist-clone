// ✅ Load .env FIRST before anything else
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { initDB } = require('./db');

// ============================================================
// 导入中间件
// ============================================================
const { helmetConfig, corsOptions, extraSecurityHeaders, requestBodyGuard } = require('./middleware/security');
const { ipFilter, apiLimiter, authLimiter, writeLimiter, adminLimiter } = require('./middleware/rateLimiter');
const { cacheMiddleware, getCacheStats, invalidateByUser } = require('./middleware/cache');
const { requestTimer, createSlowQueryWrapper, collectMetrics, getMetrics, getMemoryUsage, startMemoryMonitor } = require('./middleware/performance');

// ============================================================
// WebSocket 模块
// ============================================================
const WebSocketManager = require('./websocket');
const NotificationService = require('./websocket/notificationService');
const MessageQueue = require('./websocket/messageQueue');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// 安全中间件（最外层）
// ============================================================
app.use(helmetConfig);                    // Helmet 安全头
app.use(cors(corsOptions));               // CORS 配置
app.use(extraSecurityHeaders);            // 额外安全头 + Request ID
app.use(express.json({ limit: '512kb' })); // 请求体大小限制（从 1MB 降到 512KB）
app.use(requestBodyGuard(512 * 1024));    // 双重检查请求体大小
app.use(ipFilter);                        // IP 黑名单过滤

// ============================================================
// 性能监控
// ============================================================
app.use(requestTimer);                    // 请求耗时统计
app.use(collectMetrics);                  // 请求指标收集

// ============================================================
// WebSocket 单例注入到 app.locals（供路由使用）
// ============================================================
const notificationService = new NotificationService();
const messageQueue = new MessageQueue();
const wsManager = new WebSocketManager();

app.locals.wsManager = wsManager;
app.locals.notificationService = notificationService;
app.locals.messageQueue = messageQueue;

// ============================================================
// 通用 API 限流
// ============================================================
app.use('/api', apiLimiter);

// ============================================================
// 路由注册（带独立限流和缓存）
// ============================================================

// 认证路由 - 严格限流，无缓存
app.use('/api/auth', authLimiter, require('./routes/auth'));

// 项目路由 - 写操作限流 + 读缓存
app.use('/api/projects',
  (req, res, next) => {
    if (req.method === 'GET') {
      return cacheMiddleware({
        ttl: 30,
        tags: ['projects'],
        keyGenerator: (req) => `cache:${req.user?.id || 'anon'}:projects:${req.originalUrl}`,
      })(req, res, next);
    }
    return writeLimiter(req, res, next);
  },
  require('./routes/projects')
);

// 任务路由 - 写操作限流 + 读缓存（更短 TTL，因为任务变化频繁）
app.use('/api/tasks',
  (req, res, next) => {
    if (req.method === 'GET') {
      return cacheMiddleware({
        ttl: 15,
        tags: ['tasks'],
        keyGenerator: (req) => `cache:${req.user?.id || 'anon'}:tasks:${req.originalUrl}`,
      })(req, res, next);
    }
    return writeLimiter(req, res, next);
  },
  require('./routes/tasks')
);

// 标签路由 - 写操作限流 + 读缓存
app.use('/api/labels',
  (req, res, next) => {
    if (req.method === 'GET') {
      return cacheMiddleware({
        ttl: 60,
        tags: ['labels'],
        keyGenerator: (req) => `cache:${req.user?.id || 'anon'}:labels:${req.originalUrl}`,
      })(req, res, next);
    }
    return writeLimiter(req, res, next);
  },
  require('./routes/labels')
);

// 评论路由 - 写操作限流
app.use('/api/comments', writeLimiter, require('./routes/comments'));

// 番茄钟路由 - 写操作限流
app.use('/api/pomodoro', writeLimiter, require('./routes/pomodoro'));

// 管理员路由 - 管理员限流
app.use('/api/admin', adminLimiter, require('./routes/admin'));

// ============================================================
// 健康检查和监控端点
// ============================================================
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

// WebSocket 状态端点
app.get('/api/ws/stats',
  require('./middleware/auth').authenticate,
  (req, res) => {
    res.json(wsManager.getStats());
  }
);

// 性能指标端点（仅管理员）
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

// 缓存管理端点（仅管理员）
app.post('/api/admin/cache/invalidate',
  require('./middleware/auth').authenticate,
  require('./middleware/auth').requireAdmin,
  (req, res) => {
    const { tag, userId } = req.body;
    if (tag) {
      const { invalidateByTag } = require('./middleware/cache');
      invalidateByTag(tag);
      res.json({ success: true, message: `已清除标签 "${tag}" 的缓存` });
    } else if (userId) {
      invalidateByUser(userId);
      res.json({ success: true, message: `已清除用户 "${userId}" 的缓存` });
    } else {
      const { invalidateAll } = require('./middleware/cache');
      invalidateAll();
      res.json({ success: true, message: '已清除所有缓存' });
    }
  }
);

// ============================================================
// 静态文件和 404
// ============================================================
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'dist', 'index.html')));
}

// 统一的 404 和错误处理中间件
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================
// 截止日期提醒检查（每 5 分钟）
// ============================================================
const DEADLINE_CHECK_INTERVAL = 5 * 60 * 1000;

function checkDeadlines() {
  try {
    const { queryAll } = require('./db');
    const now = new Date();
    const in30Min = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const nowISO = now.toISOString();

    // 查找 30 分钟内到期且未完成的任务
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
          message: `任务 "${task.title}" 将在30分钟内到期`,
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
// 启动服务器
// ============================================================
initDB().then(() => {
  // 包装数据库模块以添加慢查询日志
  createSlowQueryWrapper(require('./db'));

  // 启动内存监控
  startMemoryMonitor(30000);

  // 创建 HTTP 服务器（用于 WebSocket 升级）
  const server = http.createServer(app);

  // 初始化 WebSocket 服务器
  wsManager.init(server, notificationService, messageQueue);

  server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket available at ws://localhost:${PORT}/ws`);
    console.log(`📊 Memory: ${JSON.stringify(getMemoryUsage())}`);
    console.log(`🔒 Security: Helmet, CORS, Rate Limiting enabled`);
    console.log(`⚡ Performance: Request timer, Slow query logging, Memory monitor enabled`);

    // 启动截止日期提醒定时器
    setInterval(checkDeadlines, DEADLINE_CHECK_INTERVAL);
    // 启动时立即检查一次
    checkDeadlines();
  });

  // 优雅关闭
  const gracefulShutdown = () => {
    console.log('\n🛑 Shutting down gracefully...');
    wsManager.close();
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
    // 5 秒后强制退出
    setTimeout(() => process.exit(1), 5000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}).catch(err => {
  console.error('Failed to init database:', err);
  process.exit(1);
});
