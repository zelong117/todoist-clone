const express = require('express');
const router = express.Router();

/**
 * GET /api/docs
 * Swagger 风格 API 文档（简化版）
 */
router.get('/', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Todoist Clone API',
      version: '2.0.0',
      description: '商用版 Todoist 克隆后端 API 文档',
    },
    servers: [
      { url: 'http://localhost:3001', description: '本地开发' },
      { url: 'http://192.168.0.5:3001', description: '局域网' },
    ],
    paths: {
      '/api/auth/register': {
        post: { summary: '用户注册', tags: ['认证'] },
      },
      '/api/auth/login': {
        post: { summary: '用户登录', tags: ['认证'] },
      },
      '/api/auth/me': {
        get: { summary: '获取当前用户', tags: ['认证'] },
      },
      '/api/auth/forgot-password': {
        post: { summary: '忘记密码', tags: ['认证'] },
      },
      '/api/auth/reset-password': {
        post: { summary: '重置密码', tags: ['认证'] },
      },
      '/api/auth/google': {
        get: { summary: 'Google 登录', tags: ['OAuth'] },
      },
      '/api/auth/wechat': {
        get: { summary: '微信登录', tags: ['OAuth'] },
      },
      '/api/tasks': {
        get: { summary: '获取任务列表', tags: ['任务'] },
        post: { summary: '创建任务', tags: ['任务'] },
      },
      '/api/tasks/{id}': {
        put: { summary: '更新任务', tags: ['任务'] },
        delete: { summary: '删除任务', tags: ['任务'] },
      },
      '/api/tasks/{id}/complete': {
        post: { summary: '完成/取消完成任务', tags: ['任务'] },
      },
      '/api/tasks/{taskId}/attachments': {
        get: { summary: '获取附件列表', tags: ['附件'] },
        post: { summary: '上传附件', tags: ['附件'] },
      },
      '/api/projects': {
        get: { summary: '获取项目列表', tags: ['项目'] },
        post: { summary: '创建项目', tags: ['项目'] },
      },
      '/api/projects/{id}/shares': {
        get: { summary: '获取项目成员', tags: ['共享'] },
      },
      '/api/projects/{id}/share': {
        post: { summary: '邀请成员', tags: ['共享'] },
      },
      '/api/teams': {
        get: { summary: '获取团队列表', tags: ['团队'] },
        post: { summary: '创建团队', tags: ['团队'] },
      },
      '/api/teams/{id}/members': {
        get: { summary: '获取团队成员', tags: ['团队'] },
      },
      '/api/teams/{id}/invite': {
        post: { summary: '邀请团队成员', tags: ['团队'] },
      },
      '/api/users/avatar': {
        post: { summary: '上传头像', tags: ['用户'] },
      },
      '/api/users/settings': {
        get: { summary: '获取用户设置', tags: ['用户'] },
        put: { summary: '更新用户设置', tags: ['用户'] },
      },
      '/api/audit-logs': {
        get: { summary: '获取操作日志', tags: ['审计'] },
      },
      '/api/audit-logs/all': {
        get: { summary: '获取所有日志（管理员）', tags: ['审计'] },
      },
      '/api/pomodoro/sessions': {
        get: { summary: '获取番茄钟记录', tags: ['番茄钟'] },
      },
      '/api/pomodoro/start': {
        post: { summary: '开始番茄钟', tags: ['番茄钟'] },
      },
      '/api/pomodoro/stop': {
        post: { summary: '停止番茄钟', tags: ['番茄钟'] },
      },
      '/api/labels': {
        get: { summary: '获取标签', tags: ['标签'] },
        post: { summary: '创建标签', tags: ['标签'] },
      },
      '/api/admin/stats': {
        get: { summary: '管理后台统计', tags: ['管理'] },
      },
    },
  });
});

module.exports = router;
