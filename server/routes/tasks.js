const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');

const tasks = new Map();

// Get all tasks
router.get('/', authenticate, (req, res) => {
  try {
    const userTasks = [];
    for (const task of tasks.values()) {
      if (task.userId === req.user.id) {
        userTasks.push(task);
      }
    }
    res.json(userTasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: '获取任务列表失败' });
  }
});

// Create task
router.post('/', authenticate, (req, res) => {
  try {
    const { title, projectId, sectionId, parentId, priority, dueDate, labels, plannedPomodoros } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: '任务标题不能为空' });
    }

    if (title.length > 500) {
      return res.status(400).json({ error: '任务标题不能超过500个字符' });
    }

    if (priority !== undefined && (priority < 1 || priority > 4)) {
      return res.status(400).json({ error: '优先级必须在1-4之间' });
    }

    if (plannedPomodoros !== undefined && (plannedPomodoros < 0 || !Number.isInteger(plannedPomodoros))) {
      return res.status(400).json({ error: '计划番茄数必须是非负整数' });
    }

    const task = {
      id: uuidv4(),
      userId: req.user.id,
      projectId: projectId || null,
      sectionId: sectionId || null,
      parentId: parentId || null,
      title: title.trim(),
      description: '',
      isCompleted: false,
      priority: priority || 1,
      dueDate: dueDate || null,
      labels: Array.isArray(labels) ? labels : [],
      plannedPomodoros: plannedPomodoros || 0,
      completedPomodoros: 0,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    tasks.set(task.id, task);
    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: '创建任务失败' });
  }
});

// Update task
router.put('/:id', authenticate, (req, res) => {
  try {
    const task = tasks.get(req.params.id);
    
    if (!task || task.userId !== req.user.id) {
      return res.status(404).json({ error: '任务不存在' });
    }

    const allowedFields = ['title', 'description', 'isCompleted', 'priority', 'dueDate', 'labels', 'plannedPomodoros', 'completedPomodoros', 'sortOrder', 'projectId', 'sectionId', 'parentId'];
    const sanitized = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        sanitized[key] = req.body[key];
      }
    }

    if (sanitized.title !== undefined) {
      if (!sanitized.title.trim()) {
        return res.status(400).json({ error: '任务标题不能为空' });
      }
      sanitized.title = sanitized.title.trim();
      if (sanitized.title.length > 500) {
        return res.status(400).json({ error: '任务标题不能超过500个字符' });
      }
    }

    if (sanitized.priority !== undefined && (sanitized.priority < 1 || sanitized.priority > 4)) {
      return res.status(400).json({ error: '优先级必须在1-4之间' });
    }

    if (sanitized.labels !== undefined && !Array.isArray(sanitized.labels)) {
      return res.status(400).json({ error: '标签必须是数组' });
    }

    const updatedTask = {
      ...task,
      ...sanitized,
      id: task.id,
      userId: task.userId,
      updatedAt: new Date().toISOString()
    };

    tasks.set(task.id, updatedTask);
    res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: '更新任务失败' });
  }
});

// Delete task
router.delete('/:id', authenticate, (req, res) => {
  try {
    const task = tasks.get(req.params.id);
    
    if (!task || task.userId !== req.user.id) {
      return res.status(404).json({ error: '任务不存在' });
    }

    tasks.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: '删除任务失败' });
  }
});

// Toggle complete
router.post('/:id/complete', authenticate, (req, res) => {
  try {
    const task = tasks.get(req.params.id);
    
    if (!task || task.userId !== req.user.id) {
      return res.status(404).json({ error: '任务不存在' });
    }

    const updatedTask = {
      ...task,
      isCompleted: !task.isCompleted,
      updatedAt: new Date().toISOString()
    };

    tasks.set(task.id, updatedTask);
    res.json(updatedTask);
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: '完成任务失败' });
  }
});

router.tasks = tasks;

module.exports = router;