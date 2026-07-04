/**
 * 高级 Rate Limiting 中间件
 * - 每个路由的独立限流配置
 * - 基于用户的动态限流
 * - IP 黑名单/白名单
 * - 内存存储
 */
const rateLimit = require('express-rate-limit');

// ============================================================
// IP 黑名单 / 白名单
// ============================================================
const ipBlacklist = new Set();
const ipWhitelist = new Set(
  (process.env.RATE_LIMIT_WHITELIST || '127.0.0.1,::1')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
);

function blacklistIP(ip) { ipBlacklist.add(ip); }
function whitelistIP(ip) { ipWhitelist.add(ip); }
function removeBlacklist(ip) { ipBlacklist.delete(ip); }
function isBlacklisted(ip) { return ipBlacklist.has(ip); }
function isWhitelisted(ip) { return ipWhitelist.has(ip); }

// IP 黑名单拦截中间件
function ipFilter(req, res, next) {
  const clientIP = req.ip || req.connection.remoteAddress;
  if (isBlacklisted(clientIP)) {
    return res.status(403).json({ error: '访问被禁止' });
  }
  next();
}

// ============================================================
// 自定义 Key 生成器：支持用户 ID 或 IP
// ============================================================
function userOrIpKeyGenerator(req) {
  // 优先使用已认证用户 ID
  if (req.user && req.user.id) {
    return 'user:' + req.user.id;
  }
  return req.ip;
}

// ============================================================
// 白名单跳过函数
// ============================================================
function skipWhitelisted(req) {
  const clientIP = req.ip || req.connection.remoteAddress;
  return isWhitelisted(clientIP);
}

// ============================================================
// 预定义限流配置
// ============================================================

// 通用 API 限流（较宽松）
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 分钟
  max: 300,                    // 每窗口 300 次
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  skip: skipWhitelisted,
  message: { error: '请求过于频繁，请稍后再试' },
});

// 认证路由限流（严格：防暴力破解）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  skip: skipWhitelisted,
  message: { error: '登录尝试过多，请15分钟后再试' },
});

// 写操作限流（中等）
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 分钟
  max: 60,                     // 每分钟 60 次写操作
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  skip: skipWhitelisted,
  message: { error: '操作过于频繁，请稍后再试' },
});

// 管理员路由限流
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  skip: skipWhitelisted,
  message: { error: '管理员操作过于频繁' },
});

// 严格限流（用于敏感操作如密码重置等）
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 小时
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  skip: skipWhitelisted,
  message: { error: '该操作次数已达上限，请1小时后再试' },
});

module.exports = {
  ipFilter,
  apiLimiter,
  authLimiter,
  writeLimiter,
  adminLimiter,
  strictLimiter,
  blacklistIP,
  whitelistIP,
  removeBlacklist,
  isBlacklisted,
  isWhitelisted,
};
