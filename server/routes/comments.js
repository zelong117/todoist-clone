/**
 * 评论路由
 * 处理评论的 CRUD 操作
 * 
 * 安全措施：
 * - 所有操作都验证任务归属权（确保用户只能访问自己任务的评论）
 * - 使用 Joi 进行输入验证（内容长度等）
 * - 创建评论时同时验证任务存在性和用户所有权
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { queryAll, queryOne, run } = require('../db');
const { mapComment } = require('../utils');
const validate = require('../middleware/validate');
const { createCommentSchema, commentIdParamSchema, taskIdParamSchema } = require('../validations/commentSchemas');
const { asyncHandler } = require('../middleware/errorHandler');

// Helper: get WebSocket services from app.locals
function getWsServices(req) {
  return {
    wsManager: req.app.locals.wsManager,
    notificationService: req.app.locals.notificationService,
    messageQueue: req.app.locals.messageQueue,
  };
}

/**
 * GET /tasks/:taskId/comments
 * 获取指定任务的所有评论 - 验证任务所有权
 */
router.get('/tasks/:taskId/comments', authenticate, validate({ params: taskIdParamSchema }), asyncHandler(async (req, res) => {
  const task = queryOne('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [req.params.taskId, req.user.id]);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  res.json(queryAll('SELECT * FROM comments WHERE task_id = ? AND user_id = ? ORDER BY created_at', [req.params.taskId, req.user.id]).map(mapComment));
}));

/**
 * POST /tasks/:taskId/comments
 * 为指定任务创建评论 - 验证任务所有权
 */
router.post('/tasks/:taskId/comments', authenticate, validate({ params: taskIdParamSchema, body: createCommentSchema }), asyncHandler(async (req, res) => {
  const { content } = req.body;
  const task = queryOne('SELECT id, title FROM tasks WHERE id = ? AND user_id = ?', [req.params.taskId, req.user.id]);
  if (!task) return res.status(404).json({ error: '任务不存在' });

  const id = uuidv4();
  run('INSERT INTO comments (id, task_id, user_id, content) VALUES (?, ?, ?, ?)', [id, req.params.taskId, req.user.id, content.trim()]);
  const comment = mapComment(queryOne('SELECT * FROM comments WHERE id = ?', [id]));

  // 🔔 WebSocket: 广播评论创建通知
  const { notificationService, messageQueue, wsManager } = getWsServices(req);
  if (notificationService) {
    notificationService.notify(req.user.id, 'comment:create', {
      comment,
      taskTitle: task.title,
      userId: req.user.id,
    }, wsManager, messageQueue);
  }

  res.status(201).json(comment);
}));

/**
 * DELETE /comments/:id
 * 删除评论 - 验证评论所有权
 */
router.delete('/comments/:id', authenticate, validate({ params: commentIdParamSchema }), asyncHandler(async (req, res) => {
  const c = queryOne('SELECT * FROM comments WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!c) return res.status(404).json({ error: '评论不存在' });
  run('DELETE FROM comments WHERE id = ?', [req.params.id]);

  // 🔔 WebSocket: 广播评论删除通知
  const { notificationService, messageQueue, wsManager } = getWsServices(req);
  if (notificationService) {
    notificationService.notify(req.user.id, 'comment:delete', {
      commentId: req.params.id,
      taskId: c.task_id,
      userId: req.user.id,
    }, wsManager, messageQueue);
  }

  res.json({ success: true });
}));

module.exports = router;
