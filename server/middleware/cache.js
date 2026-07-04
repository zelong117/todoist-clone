/**
 * 响应缓存中间件
 * - 内存缓存 (node-cache)
 * - ETag / Cache-Control 策略
 * - 缓存失效机制
 */
const NodeCache = require('node-cache');
const crypto = require('crypto');

// stdTTL: 默认缓存 60 秒, checkperiod: 每 120 秒清理过期
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120, useClones: false });

// 缓存统计
const stats = { hits: 0, misses: 0 };

/**
 * 缓存中间件工厂
 * @param {Object} options
 * @param {number} options.ttl - 缓存时间（秒）
 * @param {Function} options.keyGenerator - 自定义缓存键生成器
 * @param {string[]} options.tags - 缓存标签，用于批量失效
 */
function cacheMiddleware(options = {}) {
  const {
    ttl = 60,
    keyGenerator = null,
    tags = [],
  } = options;

  return (req, res, next) => {
    // 只缓存 GET 请求
    if (req.method !== 'GET') return next();

    // 生成缓存键
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `cache:${req.user ? req.user.id : 'anon'}:${req.originalUrl}`;

    // 尝试从缓存获取
    const cached = cache.get(cacheKey);
    if (cached) {
      stats.hits++;

      // 设置 ETag
      const etag = '"' + crypto.createHash('md5').update(JSON.stringify(cached.data)).digest('hex') + '"';
      res.set('ETag', etag);
      res.set('Cache-Control', `private, max-age=${ttl}`);
      res.set('X-Cache', 'HIT');

      // 检查 If-None-Match
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag === etag) {
        return res.status(304).end();
      }

      return res.json(cached.data);
    }

    stats.misses++;

    // 拦截 res.json 以缓存响应
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      // 只缓存成功响应
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, { data, tags }, ttl);

        // 存储标签到键的映射
        for (const tag of tags) {
          const tagKey = `tag:${tag}`;
          const keys = cache.get(tagKey) || new Set();
          keys.add(cacheKey);
          cache.set(tagKey, keys, 0); // 永不过期
        }

        // 设置缓存头
        const etag = '"' + crypto.createHash('md5').update(JSON.stringify(data)).digest('hex') + '"';
        res.set('ETag', etag);
        res.set('Cache-Control', `private, max-age=${ttl}`);
        res.set('X-Cache', 'MISS');

        // 检查 If-None-Match
        const clientEtag = req.headers['if-none-match'];
        if (clientEtag === etag) {
          res.status(304);
          return res.end();
        }
      }
      return originalJson(data);
    };

    next();
  };
}

/**
 * 按标签批量清除缓存
 */
function invalidateByTag(tag) {
  const tagKey = `tag:${tag}`;
  const keys = cache.get(tagKey);
  if (keys) {
    for (const key of keys) {
      cache.del(key);
    }
    cache.del(tagKey);
  }
}

/**
 * 按用户清除缓存
 */
function invalidateByUser(userId) {
  const allKeys = cache.keys();
  const prefix = `cache:${userId}:`;
  for (const key of allKeys) {
    if (key.startsWith(prefix)) {
      cache.del(key);
    }
  }
}

/**
 * 清除所有缓存
 */
function invalidateAll() {
  cache.flushAll();
}

/**
 * 获取缓存统计
 */
function getCacheStats() {
  return {
    ...stats,
    keys: cache.getStats().keys,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: stats.hits + stats.misses > 0
      ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%'
      : '0%',
  };
}

module.exports = {
  cacheMiddleware,
  invalidateByTag,
  invalidateByUser,
  invalidateAll,
  getCacheStats,
};
