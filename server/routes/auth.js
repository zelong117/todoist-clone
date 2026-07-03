const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

// In-memory storage (use database in production)
const users = new Map();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    
    if (!email || !name || !password) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }

    if (email.length > 255) {
      return res.status(400).json({ error: '邮箱长度不能超过255个字符' });
    }

    if (name.trim().length < 1 || name.length > 100) {
      return res.status(400).json({ error: '用户名长度应在1-100个字符之间' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度不能少于6个字符' });
    }
    if (password.length > 128) {
      return res.status(400).json({ error: '密码长度不能超过128个字符' });
    }

    // Check if email already exists
    for (const user of users.values()) {
      if (user.email === email.toLowerCase()) {
        return res.status(400).json({ error: '该邮箱已被注册' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    
    const user = {
      id: uuidv4(),
      email: email.toLowerCase().trim(),
      name: name.trim(),
      passwordHash,
      role: 'user',
      createdAt: new Date().toISOString()
    };
    
    users.set(user.id, user);

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: '请填写邮箱和密码' });
    }

    let foundUser = null;
    for (const user of users.values()) {
      if (user.email === email.toLowerCase().trim()) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const valid = await bcrypt.compare(password, foundUser.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const token = jwt.sign(
      { id: foundUser.id, email: foundUser.email, name: foundUser.name, role: foundUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// Get current user
router.get('/me', authenticate, (req, res) => {
  try {
    const user = users.get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

router.users = users;

module.exports = router;