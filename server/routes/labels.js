const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run } = require('../db');
const { pick, mapLabel } = require('../utils');

router.get('/', authenticate, (req, res) => {
  try { res.json(queryAll('SELECT * FROM labels WHERE user_id = ?', [req.user.id]).map(mapLabel)); }
  catch (e) { console.error(e); res.status(500).json({ error: '获取标签失败' }); }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '标签名称不能为空' });
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) return res.status(400).json({ error: '颜色格式不正确' });
    const id = uuidv4();
    run('INSERT INTO labels (id, user_id, name, color) VALUES (?, ?, ?, ?)', [id, req.user.id, name.trim(), color||'#6B7280']);
    res.status(201).json(mapLabel(queryOne('SELECT * FROM labels WHERE id = ?', [id])));
  } catch (e) { console.error(e); res.status(500).json({ error: '创建标签失败' }); }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const label = queryOne('SELECT * FROM labels WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!label) return res.status(404).json({ error: '标签不存在' });
    const s = pick(req.body, ['name','color']);
    if (s.name) { if (!s.name.trim()) return res.status(400).json({ error: '名称不能为空' }); run('UPDATE labels SET name = ? WHERE id = ?', [s.name.trim(), req.params.id]); }
    if (s.color && /^#[0-9A-Fa-f]{6}$/.test(s.color)) run('UPDATE labels SET color = ? WHERE id = ?', [s.color, req.params.id]);
    res.json(mapLabel(queryOne('SELECT * FROM labels WHERE id = ?', [req.params.id])));
  } catch (e) { console.error(e); res.status(500).json({ error: '更新标签失败' }); }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    const l = queryOne('SELECT * FROM labels WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!l) return res.status(404).json({ error: '标签不存在' });
    run('DELETE FROM labels WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: '删除标签失败' }); }
});

module.exports = router;
