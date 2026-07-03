const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const tasksRouter = require('./tasks');

const comments = new Map();

// Get comments for a task
router.get('/tasks/:taskId/comments', authenticate, (req, res) => {
  try {
    const task = tasksRouter.tasks.get(req.params.taskId);
    if (!task || task.userId !== req.user.id) {
      return res.status(404).json({ error: '任务不存在' });
    }

    const taskComments = [];
    for (const comment of comments.values()) {
      if (comment.taskId === req.params.taskId && comment.userId === req.user.id) {
        taskComments.push(comment);
      }
    }
    res.json(taskComments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: '获取评论列表失败' });
  }
});

// Create comment on a task
router.post('/tasks/:taskId/comments', authenticate, (req, res) => {
  try {
    const { content } = req.body;
    const task = tasksRouter.tasks.get(req.params.taskId);

    if (!task || task.userId !== req.user.id) {
      return res.status(404).json({ error: '任务不存在' });
    }
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '评论内容不能为空' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: '评论内容不能超过2000个字符' });
    }

    const comment = {
      id: uuidv4(),
      taskId: req.params.taskId,
      userId: req.user.id,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    comments.set(comment.id, comment);
    res.status(201).json(comment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: '创建评论失败' });
  }
});

// Delete comment
router.delete('/comments/:id', authenticate, (req, res) => {
  try {
    const comment = comments.get(req.params.id);
    
    if (!comment || comment.userId !== req.user.id) {
      return res.status(404).json({ error: '评论不存在' });
    }

    comments.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: '删除评论失败' });
  }
});

router.comments = comments;

module.exports = router;