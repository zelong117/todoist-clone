const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run, transaction } = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');
const { getUserPlan } = require('../services/plans');

const INVITABLE_ROLES = new Set(['admin', 'member', 'guest']);

function requireTeamPlan(req, res) {
  const user = getUserPlan(req.user.id);
  if (!user || (user.role !== 'admin' && user.plan !== 'business')) {
    res.status(403).json({ error: 'Business plan required for team management' });
    return false;
  }
  return true;
}

function getMembership(teamId, userId) {
  return queryOne('SELECT id, role FROM team_members WHERE team_id = ? AND user_id = ?', [teamId, userId]);
}

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
  if (!requireTeamPlan(req, res)) return;
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
  const assignedRole = role || 'member';
  if (!INVITABLE_ROLES.has(assignedRole)) return res.status(400).json({ error: 'Invalid team role' });

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

  if (!requireTeamPlan(req, res)) return;
  const memberId = uuidv4();
  run('INSERT INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, ?)', [memberId, req.params.id, invitee.id, assignedRole]);

  res.status(201).json({ success: true, member: { id: memberId, user_id: invitee.id, name: invitee.name, email: invitee.email, role: assignedRole } });
}));

/**
 * DELETE /api/teams/:id/members/:userId
 * 移除团队成员
 */
router.delete('/:id/members/:userId', authenticate, asyncHandler(async (req, res) => {
  const team = queryOne('SELECT * FROM teams WHERE id = ?', [req.params.id]);
  if (!team) return res.status(404).json({ error: '团队不存在' });

  const myMembership = getMembership(req.params.id, req.user.id);
  const targetMembership = getMembership(req.params.id, req.params.userId);
  if (!targetMembership) return res.status(404).json({ error: 'Team member not found' });
  if (team.owner_id === req.params.userId) return res.status(400).json({ error: '不能移除团队所有者' });
  const isSelfRemoval = req.params.userId === req.user.id;
  const canRemove = myMembership?.role === 'owner'
    || (myMembership?.role === 'admin' && ['member', 'guest'].includes(targetMembership.role))
    || isSelfRemoval;
  if (!canRemove) return res.status(403).json({ error: '无权移除成员' });

  run('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [req.params.id, req.params.userId]);
  res.json({ success: true });
}));

router.patch('/:id/members/:userId', authenticate, asyncHandler(async (req, res) => {
  const { role } = req.body || {};
  if (!INVITABLE_ROLES.has(role)) return res.status(400).json({ error: 'Invalid team role' });
  const team = queryOne('SELECT owner_id FROM teams WHERE id = ?', [req.params.id]);
  if (!team) return res.status(404).json({ error: '团队不存在' });
  const actor = getMembership(req.params.id, req.user.id);
  const target = getMembership(req.params.id, req.params.userId);
  if (!target) return res.status(404).json({ error: 'Team member not found' });
  if (!requireTeamPlan(req, res)) return;
  const canEdit = actor?.role === 'owner' || (actor?.role === 'admin' && ['member', 'guest'].includes(target.role) && ['member', 'guest'].includes(role));
  if (!canEdit || team.owner_id === req.params.userId) return res.status(403).json({ error: '无权更改成员角色' });
  run('UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?', [role, req.params.id, req.params.userId]);
  res.json({ success: true, userId: req.params.userId, role });
}));

router.post('/:id/transfer-ownership', authenticate, asyncHandler(async (req, res) => {
  const { userId } = req.body || {};
  const team = queryOne('SELECT owner_id FROM teams WHERE id = ?', [req.params.id]);
  if (!team) return res.status(404).json({ error: '团队不存在' });
  if (team.owner_id !== req.user.id) return res.status(403).json({ error: 'Only the owner can transfer ownership' });
  const target = getMembership(req.params.id, userId);
  if (!target) return res.status(404).json({ error: 'New owner must be a team member' });
  if (!requireTeamPlan(req, res)) return;
  transaction(() => {
    run('UPDATE teams SET owner_id = ? WHERE id = ?', [userId, req.params.id]);
    run("UPDATE team_members SET role = 'admin' WHERE team_id = ? AND user_id = ?", [req.params.id, req.user.id]);
    run("UPDATE team_members SET role = 'owner' WHERE team_id = ? AND user_id = ?", [req.params.id, userId]);
  });
  res.json({ success: true, ownerId: userId });
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
