const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const tasksRouter = require('./tasks');

const sessions = new Map();

router.get('/sessions', authenticate, (req, res) => {
  try {
    const userSessions = [];
    for (const session of sessions.values()) {
      if (session.userId === req.user.id) {
        userSessions.push(session);
      }
    }
    res.json(userSessions);
  } catch (error) {
    console.error('Get pomodoro sessions error:', error);
    res.status(500).json({ error: '获取番茄会话列表失败' });
  }
});

router.post('/start', authenticate, (req, res) => {
  try {
    const { taskId, mode } = req.body;
    
    const validModes = ['focus', 'shortBreak', 'longBreak'];
    const sessionMode = mode || 'focus';
    
    if (!validModes.includes(sessionMode)) {
      return res.status(400).json({ error: '无效的番茄模式' });
    }

    if (taskId) {
      const task = tasksRouter.tasks.get(taskId);
      if (!task || task.userId !== req.user.id) {
        return res.status(404).json({ error: '任务不存在' });
      }
    }

    const session = {
      id: uuidv4(),
      taskId: taskId || null,
      userId: req.user.id,
      startedAt: new Date().toISOString(),
      endedAt: null,
      durationMinutes: 0,
      completed: false,
      mode: sessionMode,
      createdAt: new Date().toISOString()
    };

    sessions.set(session.id, session);
    res.status(201).json(session);
  } catch (error) {
    console.error('Start pomodoro error:', error);
    res.status(500).json({ error: '开始番茄会话失败' });
  }
});

router.post('/stop', authenticate, (req, res) => {
  try {
    const { sessionId, completed } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: '会话ID不能为空' });
    }

    const session = sessions.get(sessionId);
    
    if (!session || session.userId !== req.user.id) {
      return res.status(404).json({ error: '会话不存在' });
    }

    if (session.endedAt) {
      return res.status(400).json({ error: '会话已经结束' });
    }

    const endedAt = new Date();
    const startedAt = new Date(session.startedAt);
    const durationMinutes = (endedAt - startedAt) / (1000 * 60);

    const updatedSession = {
      ...session,
      endedAt: endedAt.toISOString(),
      durationMinutes: Math.round(durationMinutes * 100) / 100,
      completed: !!completed
    };

    sessions.set(session.id, updatedSession);
    res.json(updatedSession);
  } catch (error) {
    console.error('Stop pomodoro error:', error);
    res.status(500).json({ error: '停止番茄会话失败' });
  }
});

router.sessions = sessions;

module.exports = router;