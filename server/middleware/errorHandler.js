/**
 * 统一错误处理中间件
 * 
 * 集中处理所有未捕获的错误，返回统一格式的错误响应
 * 避免泄露内部错误信息到客户端
 */

/**
 * 404 处理 - 未匹配到路由时调用
 */
function notFoundHandler(req, res) {
  res.status(404).json({ error: '接口不存在' });
}

/**
 * 全局错误处理中间件
 * Express 要求 4 个参数签名才能识别为错误中间件
 */
function errorHandler(err, req, res, _next) {
  // 记录完整错误到服务端日志
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // 如果是自定义业务错误（带 statusCode），使用其状态码
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Attachment exceeds the 10MB limit' });
  }

  // Joi 验证错误（不应到达此处，因为 validate 中间件已处理，但作为安全兜底）
  if (err.isJoi) {
    return res.status(400).json({ error: err.details.map(d => d.message).join('; ') });
  }

  // JSON 解析错误（请求体格式错误）
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: '请求体 JSON 格式错误' });
  }

  // 请求体过大
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: '请求体过大' });
  }

  // 其他未知错误 - 不泄露内部信息
  res.status(500).json({ error: '服务器内部错误' });
}

/**
 * 异步路由包装器
 * 自动捕获 async 函数中的异常并传递给错误处理中间件
 * 用法: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 创建自定义业务错误
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

module.exports = { notFoundHandler, errorHandler, asyncHandler, AppError };
