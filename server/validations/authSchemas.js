/**
 * 认证路由 (auth) 的 Joi 验证模式
 */
const Joi = require('joi');

// 通用 UUID 验证
const uuidSchema = Joi.string().uuid({ version: 'uuidv4' });

// 注册验证
const registerSchema = Joi.object({
  email: Joi.string().email().max(255).required().messages({
    'string.email': '邮箱格式不正确',
    'string.empty': '邮箱不能为空',
    'any.required': '邮箱为必填项',
  }),
  name: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': '用户名不能为空',
    'string.max': '用户名不能超过100个字符',
    'any.required': '用户名为必填项',
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': '密码至少8位',
    'string.max': '密码不能超过128位',
    'any.required': '密码为必填项',
  }),
});

// 登录验证
const loginSchema = Joi.object({
  email: Joi.string().email().max(255).required().messages({
    'string.email': '邮箱格式不正确',
    'any.required': '邮箱为必填项',
  }),
  password: Joi.string().min(1).max(128).required().messages({
    'string.empty': '密码不能为空',
    'any.required': '密码为必填项',
  }),
});

module.exports = { registerSchema, loginSchema, uuidSchema };
