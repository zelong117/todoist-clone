const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');

const labels = new Map();

router.get('/', authenticate, (req, res) => {
  const userLabels = [];
  for (const label of labels.values()) {
    if (label.userId === req.user.id) {
      userLabels.push(label);
    }
  }
  res.json(userLabels);
});

router.post('/', authenticate, (req, res) => {
  const { name, color } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '标签名称不能为空' });
  }

  const label = {
    id: uuidv4(),
    userId: req.user.id,
    name,
    color: color || '#6B7280',
    createdAt: new Date().toISOString()
  };

  labels.set(label.id, label);
  res.json(label);
});

router.put('/:id', authenticate, (req, res) => {
  const label = labels.get(req.params.id);
  
  if (!label || label.userId !== req.user.id) {
    return res.status(404).json({ error: '标签不存在' });
  }

  const allowedFields = ['name', 'color'];
  const sanitized = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      sanitized[key] = req.body[key];
    }
  }

  const updatedLabel = {
    ...label,
    ...sanitized,
    id: label.id,
    userId: label.userId
  };

  labels.set(label.id, updatedLabel);
  res.json(updatedLabel);
});

router.delete('/:id', authenticate, (req, res) => {
  const label = labels.get(req.params.id);
  
  if (!label || label.userId !== req.user.id) {
    return res.status(404).json({ error: '标签不存在' });
  }

  labels.delete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
