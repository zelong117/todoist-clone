/**
 * 安全加固中间件
 * - Helmet 安全头
 * - CORS 配置优化
 * - 请求大小限制
 * - 额外安全头
 */
const helmet = require('helmet');

/**
 * Helmet 安全头配置
 */
const helmetConfig = helmet({
  // Content-Security-Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Vite dev 需要
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // 跨域嵌入保护
  crossOriginEmbedderPolicy: false,  // 可能影响资源加载
  crossOriginResourcePolicy: { policy: 'same-site' },
  // HSTS
  hsts: {
    maxAge: 31536000,    // 1 年
    includeSubDomains: true,
    preload: true,
  },
  // X-Content-Type-Options
  noSniff: true,
  // X-Frame-Options
  frameguard: { action: 'deny' },
  // X-XSS-Protection (legacy but still useful)
  xssFilter: true,
  // Referrer-Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Permissions-Policy
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'none'"],
      payment: ["'none'"],
    },
  },
});

/**
 * CORS 配置
 */
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
      .split(',')
      .map(s => s.trim());

    // 允许无 origin（如移动应用、curl）
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS 策略不允许该来源'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['ETag', 'X-Cache', 'X-Request-Id', 'X-Response-Time'],
  maxAge: 86400, // 预检请求缓存 24 小时
};

/**
 * 额外安全头中间件
 */
function extraSecurityHeaders(req, res, next) {
  // 移除服务器指纹
  res.removeHeader('X-Powered-By');

  // 请求 ID（用于日志追踪）
  const requestId = req.headers['x-request-id'] || require('crypto').randomUUID();
  req.requestId = requestId;
  res.set('X-Request-Id', requestId);

  next();
}

/**
 * 请求体大小检查（在 express.json 之后使用）
 */
function requestBodyGuard(maxSizeBytes = 1024 * 1024) {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        error: '请求体过大',
        maxSize: `${Math.round(maxSizeBytes / 1024)}KB`,
      });
    }
    next();
  };
}

module.exports = {
  helmetConfig,
  corsOptions,
  extraSecurityHeaders,
  requestBodyGuard,
};
