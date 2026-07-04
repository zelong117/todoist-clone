/**
 * 统一输入验证中间件
 * 使用 Joi 模式验证请求体、查询参数和路由参数
 */
/**
 * 创建验证中间件工厂函数
 * @param {Object} schemas - 包含 body/query/params 的 Joi schema
 * @returns {Function} Express 中间件
 */
function validate(schemas) {
  return (req, res, next) => {
    const errors = [];

    // 验证请求体
    if (schemas.body) {
      const { error, value } = schemas.body.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        errors.push(...error.details.map(d => d.message));
      } else {
        req.body = value; // 使用验证后的值（已去除未知字段）
      }
    }

    // 验证查询参数
    if (schemas.query) {
      const { error, value } = schemas.query.validate(req.query, { abortEarly: false, stripUnknown: true });
      if (error) {
        errors.push(...error.details.map(d => d.message));
      } else {
        req.query = value;
      }
    }

    // 验证路由参数
    if (schemas.params) {
      const { error, value } = schemas.params.validate(req.params, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(d => d.message));
      } else {
        req.params = value;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    next();
  };
}

module.exports = validate;
