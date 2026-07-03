const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');

const projects = new Map();

router.get('/', authenticate, (req, res) => {
  const userProjects = [];
  for (const project of projects.values()) {
    if (project.userId === req.user.id) {
      userProjects.push(project);
    }
  }
  res.json(userProjects);
});

router.post('/', authenticate, (req, res) => {
  const { name, color, usePomodoro } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '项目名称不能为空' });
  }

  const project = {
    id: uuidv4(),
    userId: req.user.id,
    name,
    color: color || '#DC4C3E',
    isFavorite: false,
    usePomodoro: usePomodoro || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  projects.set(project.id, project);
  res.json(project);
});

router.put('/:id', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ error: '项目不存在' });
  }

  const allowedFields = ['name', 'color', 'isFavorite', 'usePomodoro'];
  const sanitized = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      sanitized[key] = req.body[key];
    }
  }

  const updatedProject = {
    ...project,
    ...sanitized,
    id: project.id,
    userId: project.userId,
    updatedAt: new Date().toISOString()
  };

  projects.set(project.id, updatedProject);
  res.json(updatedProject);
});

router.delete('/:id', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ error: '项目不存在' });
  }

  projects.delete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
