const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run } = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');
const PROJECT_ROLES = new Set(['admin', 'member', 'viewer']);

/**
 * GET /api/projects/:id/shares
 * 获取项目成员列表
 */
router.get('/:id/shares', authenticate, asyncHandler(async (req, res) => {
  const project = queryOne('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ error: '项目不存在' });

  const isOwner = project.user_id === req.user.id;
  const isMember = queryOne('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!isOwner && !isMember) return res.status(403).json({ error: '无权访问' });

  const members = queryAll(`
    SELECT pm.id, pm.user_id, pm.role, pm.joined_at, u.name, u.email
    FROM project_members pm
    LEFT JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
    ORDER BY pm.joined_at
  `, [req.params.id]);

  const owner = { id: 'owner', user_id: project.user_id, role: 'owner', name: queryOne('SELECT name FROM users WHERE id = ?', [project.user_id])?.name, email: queryOne('SELECT email FROM users WHERE id = ?', [project.user_id])?.email, joined_at: project.created_at };

  res.json([owner, ...members]);
}));

/**
 * POST /api/projects/:id/share
 * 邀请用户加入项目
 */
router.post('/:id/share', authenticate, asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const normalizedRole = role || 'member';
  if (!PROJECT_ROLES.has(normalizedRole)) return res.status(400).json({ error: 'Invalid project role' });
  if (!email) return res.status(400).json({ error: '请输入邮箱' });

  const project = queryOne('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ error: '项目不存在' });

  const isOwner = project.user_id === req.user.id;
  const myMembership = queryOne('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!isOwner && myMembership?.role !== 'admin') {
    return res.status(403).json({ error: '只有项目所有者或管理员可以邀请成员' });
  }

  const invitee = queryOne('SELECT id, name, email FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (!invitee) return res.status(404).json({ error: '该用户尚未注册' });
  if (invitee.id === project.user_id) return res.status(400).json({ error: '不能邀请所有者' });

  const existing = queryOne('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?', [req.params.id, invitee.id]);
  if (existing) return res.status(400).json({ error: '该用户已是项目成员' });

  const id = uuidv4();
  run('INSERT INTO project_members (id, project_id, user_id, role, invited_by) VALUES (?, ?, ?, ?, ?)', [id, req.params.id, invitee.id, normalizedRole, req.user.id]);

  res.status(201).json({ success: true, member: { id, user_id: invitee.id, name: invitee.name, email: invitee.email, role: normalizedRole } });
}));

/**
 * PUT /api/projects/:id/shares/:userId
 * 更新成员角色
 */
router.put('/:id/shares/:userId', authenticate, asyncHandler(async (req, res) => {
  const project = queryOne('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ error: '项目不存在' });
  if (project.user_id !== req.user.id) return res.status(403).json({ error: '只有所有者可以修改角色' });

  const { role } = req.body;
  if (!['admin', 'member', 'viewer'].includes(role)) return res.status(400).json({ error: '无效角色' });

  run('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?', [role, req.params.id, req.params.userId]);
  res.json({ success: true });
}));

/**
 * DELETE /api/projects/:id/shares/:userId
 * 移除成员
 */
router.delete('/:id/shares/:userId', authenticate, asyncHandler(async (req, res) => {
  const project = queryOne('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ error: '项目不存在' });

  const isOwner = project.user_id === req.user.id;
  if (!isOwner && req.params.userId !== req.user.id) {
    return res.status(403).json({ error: '无权移除其他成员' });
  }

  run('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [req.params.id, req.params.userId]);
  res.json({ success: true });
}));

module.exports = router;
