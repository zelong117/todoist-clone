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
const { cacheMiddleware, getCacheStats, invalidateByUser } = require('./middleware/cache');
const { requestTimer, collectMetrics, getMetrics, getMemoryUsage, startMemoryMonitor, createSlowQueryWrapper } = require('./middleware/performance');

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

// 浠诲姟璺敱 - 鍐欐搷浣滈檺娴?+ 璇荤紦瀛橈紙鏇寸煭 TTL锛屽洜涓轰换鍔″彉鍖栭绻侊級
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

// 鏍囩璺敱 - 鍐欐搷浣滈檺娴?+ 璇荤紦瀛?
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

app.use('/api/filters', writeLimiter, require('./routes/filters'));
app.use('/api/notifications', writeLimiter, require('./routes/notifications'));
app.use('/api/insights', require('./routes/insights'));


// 璇勮璺敱 - 鍐欐搷浣滈檺娴?
app.use('/api/comments', writeLimiter, require('./routes/comments'));

// 鐣寗閽熻矾鐢?- 鍐欐搷浣滈檺娴?
app.use('/api/pomodoro', writeLimiter, require('./routes/pomodoro'));

// 绠＄悊鍛樿矾鐢?- 绠＄悊鍛橀檺娴?
app.use('/api/admin', adminLimiter, require('./routes/admin'));

// ============================================================
// 鍋ュ悍妫€鏌ュ拰鐩戞帶绔偣
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
      res.json({ success: true, message: `Invalidated cache tag "${tag}"` });
    } else if (userId) {
      invalidateByUser(userId);
      res.json({ success: true, message: `Invalidated cache for user "${userId}"` });
    } else {
      const { invalidateAll } = require('./middleware/cache');
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

  server.listen(PORT, () => {
    console.log(`鉁?Server running on http://localhost:${PORT}`);
    console.log(`馃攲 WebSocket available at ws://localhost:${PORT}/ws`);
    console.log(`馃搳 Memory: ${JSON.stringify(getMemoryUsage())}`);
    console.log(`馃敀 Security: Helmet, CORS, Rate Limiting enabled`);
    console.log(`鈿?Performance: Request timer, Slow query logging, Memory monitor enabled`);

    // 鍚姩鎴鏃ユ湡鎻愰啋瀹氭椂鍣?
    setInterval(checkDeadlines, DEADLINE_CHECK_INTERVAL);
    // 鍚姩鏃剁珛鍗虫鏌ヤ竴娆?
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
}).catch(err => {
  console.error('Failed to init database:', err);
  process.exit(1);
});

