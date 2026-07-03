const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');

const comments = new Map();

router.get('/tasks/:taskId/comments', authenticate, (req, res) => {
  const taskComments = [];
  for (const comment of comments.values()) {
    if (comment.taskId === req.params.taskId) {
      taskComments.push(comment);
    }
  }
  res.json(taskComments);
});

router.post('/tasks/:taskId/comments', authenticate, (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }

  const comment = {
    id: uuidv4(),
    taskId: req.params.taskId,
    userId: req.user.id,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  comments.set(comment.id, comment);
  res.json(comment);
});

router.delete('/comments/:id', authenticate, (req, res) => {
  const comment = comments.get(req.params.id);
  
  if (!comment || comment.userId !== req.user.id) {
    return res.status(404).json({ error: '评论不存在' });
  }

  comments.delete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
