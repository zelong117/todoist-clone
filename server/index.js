// ✅ Load .env FIRST before anything else
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log('[' + new Date().toISOString() + '] ' + req.method + ' ' + req.url);
    next();
  });
}

// Rate limiting
try {
  const rateLimit = require('express-rate-limit');
  app.use('/api/auth', rateLimit({ windowMs: 15*60*1000, max: 20, message: { error: '请求过于频繁' } }));
} catch (e) { console.warn('rate-limit not installed, skipping'); }

app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/labels', require('./routes/labels'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/pomodoro', require('./routes/pomodoro'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'dist', 'index.html')));
}

app.use((req, res) => res.status(404).json({ error: '接口不存在' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: '服务器内部错误' }); });

// Init DB then start
initDB().then(() => {
  app.listen(PORT, () => {
    console.log('Server running on http://localhost:' + PORT);
  });
}).catch(err => {
  console.error('Failed to init database:', err);
  process.exit(1);
});
