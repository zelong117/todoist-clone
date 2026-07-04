/**
 * 标签路由
 * 处理标签的 CRUD 操作
 * 
 * 安全措施：
 * - 所有查询都通过 user_id 过滤，确保数据隔离
 * - 使用 Joi 进行输入验证（名称长度、颜色格式等）
 * - 使用 pick() 防止批量赋值攻击
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run } = require('../db');
const { mapLabel } = require('../utils');
const validate = require('../middleware/validate');
const { createLabelSchema, updateLabelSchema, labelIdParamSchema } = require('../validations/labelSchemas');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /
 * 获取当前用户的所有标签
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  res.json(queryAll('SELECT * FROM labels WHERE user_id = ?', [req.user.id]).map(mapLabel));
}));

/**
 * POST /
 * 创建新标签
 */
router.post('/', authenticate, validate({ body: createLabelSchema }), asyncHandler(async (req, res) => {
  const { name, color } = req.body;
  const id = uuidv4();
  run('INSERT INTO labels (id, user_id, name, color) VALUES (?, ?, ?, ?)', [id, req.user.id, name.trim(), color || '#6B7280']);
  res.status(201).json(mapLabel(queryOne('SELECT * FROM labels WHERE id = ?', [id])));
}));

/**
 * PUT /:id
 * 更新标签 - 验证标签所有权
 */
router.put('/:id', authenticate, validate({ params: labelIdParamSchema, body: updateLabelSchema }), asyncHandler(async (req, res) => {
  const label = queryOne('SELECT * FROM labels WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!label) return res.status(404).json({ error: '标签不存在' });

  const s = req.body;
  if (s.name !== undefined) {
    if (!s.name.trim()) return res.status(400).json({ error: '名称不能为空' });
    run('UPDATE labels SET name = ? WHERE id = ?', [s.name.trim(), req.params.id]);
  }
  if (s.color !== undefined) {
    run('UPDATE labels SET color = ? WHERE id = ?', [s.color, req.params.id]);
  }
  res.json(mapLabel(queryOne('SELECT * FROM labels WHERE id = ?', [req.params.id])));
}));

/**
 * DELETE /:id
 * 删除标签 - 验证标签所有权
 */
router.delete('/:id', authenticate, validate({ params: labelIdParamSchema }), asyncHandler(async (req, res) => {
  const l = queryOne('SELECT * FROM labels WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!l) return res.status(404).json({ error: '标签不存在' });
  run('DELETE FROM labels WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

module.exports = router;
