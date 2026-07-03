const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run } = require('../db');
const { pick, mapTask } = require('../utils');

router.get('/', authenticate, (req, res) => {
  try {
    const rows = queryAll('SELECT * FROM tasks WHERE user_id = ? ORDER BY sort_order', [req.user.id]);
    res.json(rows.map(mapTask));
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: '获取任务列表失败' });
  }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { title, projectId, sectionId, parentId, priority, dueDate, labels, plannedPomodoros } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: '任务标题不能为空' });
    if (title.length > 500) return res.status(400).json({ error: '任务标题不能超过500个字符' });
    if (priority !== undefined && (priority < 1 || priority > 4)) return res.status(400).json({ error: '优先级必须在1-4之间' });

    if (projectId) {
      const p = queryOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectId, req.user.id]);
      if (!p) return res.status(400).json({ error: '项目不存在' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const pp = plannedPomodoros || 1;
    run('INSERT INTO tasks (id, user_id, project_id, section_id, parent_id, title, priority, due_date, labels, planned_pomodoros, estimated_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.user.id, projectId||null, sectionId||null, parentId||null, title.trim(), priority||1, dueDate||null, JSON.stringify(Array.isArray(labels)?labels:[]), pp, pp*25, now, now]);

    const task = queryOne('SELECT * FROM tasks WHERE id = ?', [id]);
    res.status(201).json(mapTask(task));
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: '创建任务失败' });
  }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const task = queryOne('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!task) return res.status(404).json({ error: '任务不存在' });

    const allowed = ['title','description','isCompleted','completedAt','priority','dueDate','labels','plannedPomodoros','completedPomodoros','pomodoroCount','estimatedMinutes','sortOrder','projectId','sectionId','parentId'];
    const sanitized = pick(req.body, allowed);

    if (sanitized.title !== undefined) {
      if (!sanitized.title.trim()) return res.status(400).json({ error: '任务标题不能为空' });
      sanitized.title = sanitized.title.trim();
    }
    if (sanitized.labels !== undefined && !Array.isArray(sanitized.labels)) return res.status(400).json({ error: '标签必须是数组' });

    const fieldMap = { title:'title', description:'description', isCompleted:'is_completed', completedAt:'completed_at', priority:'priority', dueDate:'due_date', labels:'labels', plannedPomodoros:'planned_pomodoros', completedPomodoros:'completed_pomodoros', pomodoroCount:'pomodoro_count', estimatedMinutes:'estimated_minutes', sortOrder:'sort_order', projectId:'project_id', sectionId:'section_id', parentId:'parent_id' };

    const sets = []; const values = [];
    for (const [jk, dk] of Object.entries(fieldMap)) {
      if (sanitized[jk] !== undefined) {
        let val = sanitized[jk];
        if (jk === 'labels') val = JSON.stringify(val);
        if (jk === 'isCompleted') val = val ? 1 : 0;
        sets.push(`${dk} = ?`); values.push(val);
      }
    }
    if (sets.length > 0) {
      sets.push('updated_at = ?'); values.push(new Date().toISOString());
      values.push(req.params.id);
      run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, values);
    }

    const updated = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json(mapTask(updated));
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: '更新任务失败' });
  }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    const task = queryOne('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    run('DELETE FROM tasks WHERE parent_id = ?', [req.params.id]);
    run('DELETE FROM comments WHERE task_id = ?', [req.params.id]);
    run('DELETE FROM pomodoro_sessions WHERE task_id = ?', [req.params.id]);
    run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: '删除任务失败' });
  }
});

router.post('/:id/complete', authenticate, (req, res) => {
  try {
    const task = queryOne('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    const newStatus = task.is_completed ? 0 : 1;
    run('UPDATE tasks SET is_completed = ?, completed_at = ?, updated_at = ? WHERE id = ?', [newStatus, newStatus ? new Date().toISOString() : null, new Date().toISOString(), req.params.id]);
    const updated = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json(mapTask(updated));
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: '完成任务失败' });
  }
});

module.exports = router;
