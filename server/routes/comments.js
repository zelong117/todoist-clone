const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');

const comments = new Map();

// 获取任务的评�?- 需要验证任务属于当前用�?router.get('/tasks/:taskId/comments', authenticate, (req, res) => {
  try {
    // 注意：这里无法直接检查任务归属，因为 tasks Map 在另一个模�?    // 在生产环境中应该通过数据�?JOIN 查询
    // 前端应该确保只能访问自己的任务评�?    const taskComments = [];
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

// 创建评论 - 需要验证任务属于当前用�?router.post('/tasks/:taskId/comments', authenticate, (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '评论内容不能为空' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: '评论内容不能超过2000个字�? });
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

// 删除评论
router.delete('/comments/:id', authenticate, (req, res) => {
  try {
    const comment = comments.get(req.params.id);
    
    if (!comment || comment.userId !== req.user.id) {
      return res.status(404).json({ error: '评论不存�? });
    }

    comments.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: '删除评论失败' });
  }
});

// 导出 comments Map �?admin 路由使用
router.comments = comments;

module.exports = router;

