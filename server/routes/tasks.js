const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');

// 内存存储（生产环境用数据库）
const tasks = new Map();

// 获取所有任务
router.get('/', authenticate, (req, res) => {
  const userTasks = [];
  for (const task of tasks.values()) {
    if (task.userId === req.user.id) {
      userTasks.push(task);
    }
  }
  res.json(userTasks);
});

// 创建任务
router.post('/', authenticate, (req, res) => {
  const { title, projectId, sectionId, parentId, priority, dueDate, labels, plannedPomodoros } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: '任务标题不能为空' });
  }

  const task = {
    id: uuidv4(),
    userId: req.user.id,
    projectId: projectId || null,
    sectionId: sectionId || null,
    parentId: parentId || null,
    title,
    description: '',
    isCompleted: false,
    priority: priority || 1,
    dueDate: dueDate || null,
    labels: labels || [],
    plannedPomodoros: plannedPomodoros || 0,
    completedPomodoros: 0,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  tasks.set(task.id, task);
  res.json(task);
});

// 更新任务
router.put('/:id', authenticate, (req, res) => {
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

  const updatedTask = {
    ...task,
    ...sanitized,
    id: task.id,
    userId: task.userId,
    updatedAt: new Date().toISOString()
  };

  tasks.set(task.id, updatedTask);
  res.json(updatedTask);
});

// 删除任务
router.delete('/:id', authenticate, (req, res) => {
  const task = tasks.get(req.params.id);
  
  if (!task || task.userId !== req.user.id) {
    return res.status(404).json({ error: '任务不存在' });
  }

  tasks.delete(req.params.id);
  res.json({ success: true });
});

// 完成任务
router.post('/:id/complete', authenticate, (req, res) => {
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
});

module.exports = router;
