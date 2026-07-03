const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run } = require('../db');
const { mapComment } = require('../utils');

router.get('/tasks/:taskId/comments', authenticate, (req, res) => {
  try {
    const task = queryOne('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [req.params.taskId, req.user.id]);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    res.json(queryAll('SELECT * FROM comments WHERE task_id = ? AND user_id = ? ORDER BY created_at', [req.params.taskId, req.user.id]).map(mapComment));
  } catch (e) { console.error(e); res.status(500).json({ error: '获取评论失败' }); }
});

router.post('/tasks/:taskId/comments', authenticate, (req, res) => {
  try {
    const { content } = req.body;
    const task = queryOne('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [req.params.taskId, req.user.id]);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    if (!content || !content.trim()) return res.status(400).json({ error: '评论内容不能为空' });
    if (content.length > 2000) return res.status(400).json({ error: '评论不能超过2000字' });
    const id = uuidv4();
    run('INSERT INTO comments (id, task_id, user_id, content) VALUES (?, ?, ?, ?)', [id, req.params.taskId, req.user.id, content.trim()]);
    res.status(201).json(mapComment(queryOne('SELECT * FROM comments WHERE id = ?', [id])));
  } catch (e) { console.error(e); res.status(500).json({ error: '创建评论失败' }); }
});

router.delete('/comments/:id', authenticate, (req, res) => {
  try {
    const c = queryOne('SELECT * FROM comments WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!c) return res.status(404).json({ error: '评论不存在' });
    run('DELETE FROM comments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: '删除评论失败' }); }
});

module.exports = router;
