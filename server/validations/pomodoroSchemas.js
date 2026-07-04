/**
 * 番茄钟路由 (pomodoro) 的 Joi 验证模式
 */
const Joi = require('joi');

const uuidSchema = Joi.string().uuid({ version: 'uuidv4' });

// 开始番茄钟验证
const startPomodoroSchema = Joi.object({
  taskId: uuidSchema.allow(null, '').optional(),
  mode: Joi.string().valid('focus', 'shortBreak', 'longBreak').default('focus').messages({
    'any.only': '无效的番茄模式，可选值：focus, shortBreak, longBreak',
  }),
});

// 停止番茄钟验证
const stopPomodoroSchema = Joi.object({
  sessionId: uuidSchema.required().messages({
    'string.guid': '无效的会话ID格式',
    'any.required': '会话ID为必填项',
  }),
  completed: Joi.boolean().default(false),
});

module.exports = { startPomodoroSchema, stopPomodoroSchema };
