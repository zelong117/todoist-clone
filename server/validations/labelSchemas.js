/**
 * 标签路由 (labels) 的 Joi 验证模式
 */
const Joi = require('joi');

const uuidSchema = Joi.string().uuid({ version: 'uuidv4' });

// 创建标签验证
const createLabelSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': '标签名称不能为空',
    'string.max': '标签名称不能超过100个字符',
    'any.required': '标签名称为必填项',
  }),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#6B7280').messages({
    'string.pattern.base': '颜色格式不正确，需为 #RRGGBB 格式',
  }),
});

// 更新标签验证
const updateLabelSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).messages({
    'string.empty': '标签名称不能为空',
    'string.max': '标签名称不能超过100个字符',
  }),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).messages({
    'string.pattern.base': '颜色格式不正确，需为 #RRGGBB 格式',
  }),
}).min(1).messages({
  'object.min': '至少需要提供一个更新字段',
});

// 路由参数验证
const labelIdParamSchema = Joi.object({
  id: uuidSchema.required().messages({
    'string.guid': '无效的标签ID格式',
    'any.required': '标签ID为必填项',
  }),
});

module.exports = { createLabelSchema, updateLabelSchema, labelIdParamSchema };
