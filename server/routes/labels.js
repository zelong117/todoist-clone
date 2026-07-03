const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');

const labels = new Map();

router.get('/', authenticate, (req, res) => {
  try {
    const userLabels = [];
    for (const label of labels.values()) {
      if (label.userId === req.user.id) {
        userLabels.push(label);
      }
    }
    res.json(userLabels);
  } catch (error) {
    console.error('Get labels error:', error);
    res.status(500).json({ error: '获取标签列表失败' });
  }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { name, color } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '标签名称不能为空' });
    }

    if (name.length > 100) {
      return res.status(400).json({ error: '标签名称不能超过100个字符' });
    }

    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).json({ error: '颜色格式不正确，应为十六进制颜色值' });
    }

    const label = {
      id: uuidv4(),
      userId: req.user.id,
      name: name.trim(),
      color: color || '#6B7280',
      createdAt: new Date().toISOString()
    };

    labels.set(label.id, label);
    res.status(201).json(label);
  } catch (error) {
    console.error('Create label error:', error);
    res.status(500).json({ error: '创建标签失败' });
  }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const label = labels.get(req.params.id);
    
    if (!label || label.userId !== req.user.id) {
      return res.status(404).json({ error: '标签不存在' });
    }

    // 字段白名单 - 防止批量赋值攻击
    const allowedFields = ['name', 'color'];
    const sanitized = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        sanitized[key] = req.body[key];
      }
    }

    // 验证字段
    if (sanitized.name !== undefined) {
      if (!sanitized.name.trim()) {
        return res.status(400).json({ error: '标签名称不能为空' });
      }
      sanitized.name = sanitized.name.trim();
      if (sanitized.name.length > 100) {
        return res.status(400).json({ error: '标签名称不能超过100个字符' });
      }
    }

    if (sanitized.color !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(sanitized.color)) {
      return res.status(400).json({ error: '颜色格式不正确，应为十六进制颜色值' });
    }

    const updatedLabel = {
      ...label,
      ...sanitized,
      id: label.id,
      userId: label.userId
    };

    labels.set(label.id, updatedLabel);
    res.json(updatedLabel);
  } catch (error) {
    console.error('Update label error:', error);
    res.status(500).json({ error: '更新标签失败' });
  }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    const label = labels.get(req.params.id);
    
    if (!label || label.userId !== req.user.id) {
      return res.status(404).json({ error: '标签不存在' });
    }

    labels.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete label error:', error);
    res.status(500).json({ error: '删除标签失败' });
  }
});

// 导出 labels Map 供 admin 路由使用
router.labels = labels;

module.exports = router;
