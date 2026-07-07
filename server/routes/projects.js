/**
 * 项目路由
 * 处理项目�?CRUD 操作
 * 
 * 安全措施�?
 * - 所有查询都通过 user_id 过滤，确保数据隔�?
 * - 使用 Joi 进行输入验证（名称长度、颜色格式等�?
 * - 使用 pick() 防止批量赋值攻�?
 * - 级联删除时限定在同一用户的数据范围内
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run, transaction } = require('../db');
const { pick, mapProject } = require('../utils');
const validate = require('../middleware/validate');
const { createProjectSchema, updateProjectSchema, projectIdParamSchema } = require('../validations/projectSchemas');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /
 * 获取当前用户的所有项�?
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  res.json(queryAll('SELECT * FROM projects WHERE user_id = ? ORDER BY sort_order', [req.user.id]).map(mapProject));
}));

/**
 * GET /:id
 * 获取单个项目详情
 */
router.get('/:id', authenticate, validate({ params: projectIdParamSchema }), asyncHandler(async (req, res) => {
  const project = queryOne('SELECT * FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(mapProject(project));
}));

/**
 * POST /
 * 创建新项目
 */
router.post('/', authenticate, validate({ body: createProjectSchema }), asyncHandler(async (req, res) => {
  const { name, color, isFavorite, usePomodoro } = req.body;
  const id = uuidv4();
  run('INSERT INTO projects (id, user_id, name, color, is_favorite, use_pomodoro) VALUES (?, ?, ?, ?, ?, ?)', [id, req.user.id, name.trim(), color || '#DC4C3E', isFavorite ? 1 : 0, usePomodoro ? 1 : 0]);
  res.status(201).json(mapProject(queryOne('SELECT * FROM projects WHERE id = ?', [id])));
}));

/**
 * PUT /:id
 * 更新项目 - 验证项目所有权
 */
router.put('/:id', authenticate, validate({ params: projectIdParamSchema, body: updateProjectSchema }), asyncHandler(async (req, res) => {
  const project = queryOne('SELECT * FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const s = pick(req.body, ['name', 'color', 'isFavorite', 'usePomodoro']);
  const sets = [];
  const vals = [];
  if (s.name !== undefined) {
    if (!s.name.trim()) return res.status(400).json({ error: 'Invalid request' });
    sets.push('name = ?');
    vals.push(s.name.trim());
  }
  if (s.color !== undefined) {
    sets.push('color = ?');
    vals.push(s.color);
  }
  if (s.isFavorite !== undefined) {
    sets.push('is_favorite = ?');
    vals.push(s.isFavorite ? 1 : 0);
  }
  if (s.usePomodoro !== undefined) {
    sets.push('use_pomodoro = ?');
    vals.push(s.usePomodoro ? 1 : 0);
  }
  if (sets.length > 0) {
    vals.push(req.params.id);
    run(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`, vals);
  }
  res.json(mapProject(queryOne('SELECT * FROM projects WHERE id = ?', [req.params.id])));
}));

/**
 * DELETE /:id
 * 删除项目 - 级联解除关联任务的项目引用（限定当前用户�?
 */
router.delete('/:id', authenticate, validate({ params: projectIdParamSchema }), asyncHandler(async (req, res) => {
  const p = queryOne('SELECT * FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!p) return res.status(404).json({ error: '项目不存在' });

  transaction(() => {
    run('UPDATE tasks SET project_id = NULL, updated_at = ? WHERE project_id = ? AND user_id = ?', [new Date().toISOString(), req.params.id, req.user.id]);
    run('DELETE FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  });
  res.json({ success: true });
}));

module.exports = router;
