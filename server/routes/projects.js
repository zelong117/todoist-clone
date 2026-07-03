const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');

const projects = new Map();

router.get('/', authenticate, (req, res) => {
  try {
    const userProjects = [];
    for (const project of projects.values()) {
      if (project.userId === req.user.id) {
        userProjects.push(project);
      }
    }
    res.json(userProjects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: '获取项目列表失败' });
  }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { name, color, usePomodoro } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '项目名称不能为空' });
    }

    if (name.length > 200) {
      return res.status(400).json({ error: '项目名称不能超过200个字符' });
    }

    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).json({ error: '颜色格式不正确，应为十六进制颜色值' });
    }

    const project = {
      id: uuidv4(),
      userId: req.user.id,
      name: name.trim(),
      color: color || '#DC4C3E',
      isFavorite: false,
      usePomodoro: !!usePomodoro,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    projects.set(project.id, project);
    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: '创建项目失败' });
  }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const project = projects.get(req.params.id);
    
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // Whitelist fields to prevent mass assignment
    const allowedFields = ['name', 'color', 'isFavorite', 'usePomodoro'];
    const sanitized = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        sanitized[key] = req.body[key];
      }
    }

    if (sanitized.name !== undefined) {
      if (!sanitized.name.trim()) {
        return res.status(400).json({ error: '项目名称不能为空' });
      }
      sanitized.name = sanitized.name.trim();
      if (sanitized.name.length > 200) {
        return res.status(400).json({ error: '项目名称不能超过200个字符' });
      }
    }

    if (sanitized.color !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(sanitized.color)) {
      return res.status(400).json({ error: '颜色格式不正确，应为十六进制颜色值' });
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
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: '更新项目失败' });
  }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    const project = projects.get(req.params.id);
    
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: '项目不存在' });
    }

    projects.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: '删除项目失败' });
  }
});

router.projects = projects;

module.exports = router;