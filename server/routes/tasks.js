const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');

// 内存存储（生产环境用数据库）
const tasks = new Map();

// 获取所有任务
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

// 创建任务
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

// 更新任务
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

    // 验证字段
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

// 删除任务
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

// 完成任务
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

// 导出 tasks Map 供其他路由使用
router.tasks = tasks;

module.exports = router;
