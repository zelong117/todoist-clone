const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

// 简单的内存存储（生产环境应该用数据库）
const users = new Map();

// 注册
router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    
    if (!email || !name || !password) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式无效' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少为6位' });
    }

    // 检查邮箱是否已存在
    for (const user of users.values()) {
      if (user.email === email) {
        return res.status(400).json({ error: '该邮箱已被注册' });
      }
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);
    
    // 创建用户
    const user = {
      id: uuidv4(),
      email,
      name,
      passwordHash,
      createdAt: new Date().toISOString()
    };
    
    users.set(user.id, user);

    // 生成 token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
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

// 登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: '请填写邮箱和密码' });
    }

    // 查找用户
    let foundUser = null;
    for (const user of users.values()) {
      if (user.email === email) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 验证密码
    const valid = await bcrypt.compare(password, foundUser.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 生成 token
    const token = jwt.sign(
      { id: foundUser.id, email: foundUser.email, name: foundUser.name },
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

// 获取当前用户
router.get('/me', authenticate, (req, res) => {
  const user = users.get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  
  res.json({
    id: user.id,
    email: user.email,
    name: user.name
  });
});

module.exports = router;
