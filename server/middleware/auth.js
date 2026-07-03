const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'todoist-clone-secret-key-2024';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

module.exports = { authenticate, JWT_SECRET };
