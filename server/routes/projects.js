const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run } = require('../db');
const { pick, mapProject } = require('../utils');

router.get('/', authenticate, (req, res) => {
  try {
    res.json(queryAll('SELECT * FROM projects WHERE user_id = ? ORDER BY sort_order', [req.user.id]).map(mapProject));
  } catch (error) { console.error(error); res.status(500).json({ error: '获取项目列表失败' }); }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { name, color, usePomodoro } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '项目名称不能为空' });
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) return res.status(400).json({ error: '颜色格式不正确' });
    const id = uuidv4();
    run('INSERT INTO projects (id, user_id, name, color, use_pomodoro) VALUES (?, ?, ?, ?, ?)', [id, req.user.id, name.trim(), color||'#DC4C3E', usePomodoro?1:0]);
    res.status(201).json(mapProject(queryOne('SELECT * FROM projects WHERE id = ?', [id])));
  } catch (error) { console.error(error); res.status(500).json({ error: '创建项目失败' }); }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const project = queryOne('SELECT * FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!project) return res.status(404).json({ error: '项目不存在' });
    const s = pick(req.body, ['name','color','isFavorite','usePomodoro']);
    const sets = []; const vals = [];
    if (s.name !== undefined) { if (!s.name.trim()) return res.status(400).json({ error: '名称不能为空' }); sets.push('name = ?'); vals.push(s.name.trim()); }
    if (s.color !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(s.color)) return res.status(400).json({ error: '颜色格式不正确' });
    if (s.color !== undefined) { sets.push('color = ?'); vals.push(s.color); }
    if (s.isFavorite !== undefined) { sets.push('is_favorite = ?'); vals.push(s.isFavorite?1:0); }
    if (s.usePomodoro !== undefined) { sets.push('use_pomodoro = ?'); vals.push(s.usePomodoro?1:0); }
    if (sets.length > 0) { vals.push(req.params.id); run(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`, vals); }
    res.json(mapProject(queryOne('SELECT * FROM projects WHERE id = ?', [req.params.id])));
  } catch (error) { console.error(error); res.status(500).json({ error: '更新项目失败' }); }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    const p = queryOne('SELECT * FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!p) return res.status(404).json({ error: '项目不存在' });
    run('UPDATE tasks SET project_id = NULL WHERE project_id = ?', [req.params.id]);
    run('DELETE FROM sections WHERE project_id = ?', [req.params.id]);
    run('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) { console.error(error); res.status(500).json({ error: '删除项目失败' }); }
});

module.exports = router;
