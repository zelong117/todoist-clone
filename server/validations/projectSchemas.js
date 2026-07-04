/**
 * 项目路由 (projects) 的 Joi 验证模式
 */
const Joi = require('joi');

const uuidSchema = Joi.string().uuid({ version: 'uuidv4' });

// 创建项目验证
const createProjectSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': '项目名称不能为空',
    'string.max': '项目名称不能超过200个字符',
    'any.required': '项目名称为必填项',
  }),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#DC4C3E').messages({
    'string.pattern.base': '颜色格式不正确，需为 #RRGGBB 格式',
  }),
  usePomodoro: Joi.boolean().default(false),
});

// 更新项目验证
const updateProjectSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).messages({
    'string.empty': '项目名称不能为空',
    'string.max': '项目名称不能超过200个字符',
  }),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).messages({
    'string.pattern.base': '颜色格式不正确，需为 #RRGGBB 格式',
  }),
  isFavorite: Joi.boolean(),
  usePomodoro: Joi.boolean(),
}).min(1).messages({
  'object.min': '至少需要提供一个更新字段',
});

// 路由参数验证
const projectIdParamSchema = Joi.object({
  id: uuidSchema.required().messages({
    'string.guid': '无效的项目ID格式',
    'any.required': '项目ID为必填项',
  }),
});

module.exports = { createProjectSchema, updateProjectSchema, projectIdParamSchema };
