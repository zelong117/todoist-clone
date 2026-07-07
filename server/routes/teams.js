const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run } = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/teams
 * 获取当前用户的团队列表
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const teams = queryAll(`
    SELECT t.*, tm.role as my_role
    FROM teams t
    JOIN team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = ?
    ORDER BY t.created_at
  `, [req.user.id]);
  res.json(teams);
}));

/**
 * POST /api/teams
 * 创建团队
 */
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: '请输入团队名称' });

  const id = uuidv4();
  run('INSERT INTO teams (id, name, description, owner_id) VALUES (?, ?, ?, ?)', [id, name.trim(), description || '', req.user.id]);

  // 创建者自动成为 owner 成员
  const memberId = uuidv4();
  run('INSERT INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, ?)', [memberId, id, req.user.id, 'owner']);

  res.status(201).json({ id, name: name.trim(), description: description || '', ownerId: req.user.id });
}));

/**
 * GET /api/teams/:id/members
 * 获取团队成员列表
 */
router.get('/:id/members', authenticate, asyncHandler(async (req, res) => {
  const team = queryOne('SELECT * FROM teams WHERE id = ?', [req.params.id]);
  if (!team) return res.status(404).json({ error: '团队不存在' });

  const myMembership = queryOne('SELECT role FROM team_members WHERE team_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!myMembership) return res.status(403).json({ error: '您不是该团队成员' });

  const members = queryAll(`
    SELECT tm.id, tm.user_id, tm.role, tm.joined_at, u.name, u.email
    FROM team_members tm
    LEFT JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = ?
    ORDER BY tm.joined_at
  `, [req.params.id]);

  res.json(members);
}));

/**
 * POST /api/teams/:id/invite
 * 邀请用户加入团队
 */
router.post('/:id/invite', authenticate, asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: '请输入邮箱' });

  const team = queryOne('SELECT * FROM teams WHERE id = ?', [req.params.id]);
  if (!team) return res.status(404).json({ error: '团队不存在' });

  const myMembership = queryOne('SELECT role FROM team_members WHERE team_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
    return res.status(403).json({ error: '无权邀请成员' });
  }

  const invitee = queryOne('SELECT id, name, email FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (!invitee) return res.status(404).json({ error: '该用户尚未注册' });

  const existing = queryOne('SELECT id FROM team_members WHERE team_id = ? AND user_id = ?', [req.params.id, invitee.id]);
  if (existing) return res.status(400).json({ error: '该用户已是团队成员' });

  const memberId = uuidv4();
  run('INSERT INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, ?)', [memberId, req.params.id, invitee.id, role || 'member']);

  res.status(201).json({ success: true, member: { id: memberId, user_id: invitee.id, name: invitee.name, email: invitee.email, role: role || 'member' } });
}));

/**
 * DELETE /api/teams/:id/members/:userId
 * 移除团队成员
 */
router.delete('/:id/members/:userId', authenticate, asyncHandler(async (req, res) => {
  const team = queryOne('SELECT * FROM teams WHERE id = ?', [req.params.id]);
  if (!team) return res.status(404).json({ error: '团队不存在' });

  const myMembership = queryOne('SELECT role FROM team_members WHERE team_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
    if (req.params.userId !== req.user.id) return res.status(403).json({ error: '无权移除成员' });
  }

  if (team.owner_id === req.params.userId) return res.status(400).json({ error: '不能移除团队所有者' });

  run('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [req.params.id, req.params.userId]);
  res.json({ success: true });
}));

/**
 * DELETE /api/teams/:id
 * 删除团队（仅所有者）
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const team = queryOne('SELECT * FROM teams WHERE id = ?', [req.params.id]);
  if (!team) return res.status(404).json({ error: '团队不存在' });
  if (team.owner_id !== req.user.id) return res.status(403).json({ error: '只有所有者可以删除团队' });

  run('DELETE FROM team_members WHERE team_id = ?', [req.params.id]);
  run('DELETE FROM teams WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

module.exports = router;
