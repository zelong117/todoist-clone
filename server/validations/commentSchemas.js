/**
 * 评论路由 (comments) 的 Joi 验证模式
 */
const Joi = require('joi');

const uuidSchema = Joi.string().uuid({ version: 'uuidv4' });

// 创建评论验证
const createCommentSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required().messages({
    'string.empty': '评论内容不能为空',
    'string.max': '评论不能超过2000字',
    'any.required': '评论内容为必填项',
  }),
});

// 路由参数验证
const commentIdParamSchema = Joi.object({
  id: uuidSchema.required().messages({
    'string.guid': '无效的评论ID格式',
    'any.required': '评论ID为必填项',
  }),
});

const taskIdParamSchema = Joi.object({
  taskId: uuidSchema.required().messages({
    'string.guid': '无效的任务ID格式',
    'any.required': '任务ID为必填项',
  }),
});

module.exports = { createCommentSchema, commentIdParamSchema, taskIdParamSchema };
