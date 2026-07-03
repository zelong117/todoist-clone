const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/auth');

// Get stats - admin only
router.get('/stats', authenticate, adminOnly, (req, res) => {
  try {
    const authRouter = require('./auth');
    const projectsRouter = require('./projects');
    const tasksRouter = require('./tasks');
    const labelsRouter = require('./labels');
    const commentsRouter = require('./comments');
    const pomodoroRouter = require('./pomodoro');

    let totalTasks = 0;
    let completedTasks = 0;
    let totalProjects = 0;
    let totalLabels = 0;
    let totalComments = 0;
    let totalPomodoros = 0;
    let completedPomodoros = 0;

    for (const task of tasksRouter.tasks.values()) {
      totalTasks++;
      if (task.isCompleted) completedTasks++;
    }
    for (const project of projectsRouter.projects.values()) {
      totalProjects++;
    }
    for (const label of labelsRouter.labels.values()) {
      totalLabels++;
    }
    for (const comment of commentsRouter.comments.values()) {
      totalComments++;
    }
    for (const session of pomodoroRouter.sessions.values()) {
      totalPomodoros++;
      if (session.completed) completedPomodoros++;
    }

    res.json({
      totalTasks,
      totalProjects,
      totalLabels,
      totalComments,
      totalPomodoros,
      completedPomodoros,
      completedTasks,
      pendingTasks: totalTasks - completedTasks
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// Get users - admin only
router.get('/users', authenticate, adminOnly, (req, res) => {
  try {
    const authRouter = require('./auth');
    const usersList = [];

    for (const user of authRouter.users.values()) {
      usersList.push({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
      });
    }

    res.json(usersList);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

module.exports = router;