/**
 * 任务路由 (tasks) 的 Joi 验证模式
 */
const Joi = require('joi');

// 通用 UUID 验证
const uuidSchema = Joi.string().uuid({ version: 'uuidv4' }).allow(null, '');

// 创建任务验证
const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(500).required().messages({
    'string.empty': '任务标题不能为空',
    'string.max': '任务标题不能超过500个字符',
    'any.required': '任务标题为必填项',
  }),
  description: Joi.string().max(5000).allow('', null).default(''),
  projectId: uuidSchema.optional(),
  sectionId: uuidSchema.optional(),
  parentId: uuidSchema.optional(),
  priority: Joi.number().integer().min(1).max(4).default(1).messages({
    'number.min': '优先级必须在1-4之间',
    'number.max': '优先级必须在1-4之间',
  }),
  dueDate: Joi.string().isoDate().allow(null, '').optional(),
  labels: Joi.array().items(Joi.string().trim().max(100)).max(50).default([]),
  plannedPomodoros: Joi.number().integer().min(0).max(100).default(1),
});

// 更新任务验证（所有字段可选）
const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(500).messages({
    'string.empty': '任务标题不能为空',
    'string.max': '任务标题不能超过500个字符',
  }),
  description: Joi.string().max(5000).allow('', null),
  isCompleted: Joi.boolean(),
  completedAt: Joi.string().isoDate().allow(null, ''),
  priority: Joi.number().integer().min(1).max(4).messages({
    'number.min': '优先级必须在1-4之间',
    'number.max': '优先级必须在1-4之间',
  }),
  dueDate: Joi.string().isoDate().allow(null, ''),
  labels: Joi.array().items(Joi.string().trim().max(100)).max(50),
  plannedPomodoros: Joi.number().integer().min(0).max(100),
  completedPomodoros: Joi.number().integer().min(0).max(1000),
  pomodoroCount: Joi.number().integer().min(0).max(1000),
  estimatedMinutes: Joi.number().integer().min(1).max(1440),
  sortOrder: Joi.number().integer().min(0).max(999999),
  projectId: uuidSchema.allow(null, ''),
  sectionId: uuidSchema.allow(null, ''),
  parentId: uuidSchema.allow(null, ''),
}).min(1).messages({
  'object.min': '至少需要提供一个更新字段',
});

// 路由参数验证
const taskIdParamSchema = Joi.object({
  id: uuidSchema.required().messages({
    'string.guid': '无效的任务ID格式',
    'any.required': '任务ID为必填项',
  }),
});

module.exports = { createTaskSchema, updateTaskSchema, taskIdParamSchema };
