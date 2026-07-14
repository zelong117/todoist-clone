# Todoist Clone 后端架构文档

## 技术栈
- **运行时**: Node.js 18+
- **框架**: Express 4
- **数据库**: SQLite (sql.js)
- **认证**: JWT (jsonwebtoken + bcryptjs)
- **文件上传**: multer
- **邮件**: nodemailer
- **实时通信**: WebSocket

## 目录结构
```
server/
├── index.js              # 入口文件，路由注册，中间件挂载
├── db.js                 # 数据库初始化，表结构定义，SQL 辅助函数
├── .env                  # 环境变量（不提交到 Git）
├── middleware/
│   ├── auth.js           # JWT 认证中间件
│   ├── security.js       # Helmet, CORS, 请求体大小限制
│   ├── rateLimiter.js    # API 限流（登录/写入/管理分别限流）
│   ├── cache.js          # 内存缓存中间件
│   ├── performance.js    # 请求计时, 内存监控, 慢查询检测
│   └── errorHandler.js   # 统一 404 和 500 错误处理
├── routes/
│   ├── auth.js           # 注册/登录/密码重置
│   ├── tasks.js          # 任务 CRUD
│   ├── projects.js       # 项目 CRUD
│   ├── shares.js         # 项目共享/成员管理
│   ├── labels.js         # 标签管理
│   ├── filters.js        # 过滤器
│   ├── comments.js       # 评论
│   ├── pomodoro.js       # 番茄钟会话
│   ├── notifications.js  # 通知
│   ├── insights.js       # 效率统计
│   ├── users.js          # 用户设置/头像
│   ├── attachments.js    # 附件上传
│   ├── admin.js          # 管理后台（用户列表/统计）
│   ├── ai.js             # AI 助手（文字优化/图片识别/目标分析）
│   ├── oauth.js          # 第三方登录（Google/微信）
│   ├── teams.js          # 团队管理
│   ├── auditLogs.js      # 审计日志
│   └── docs.js           # API 文档（OpenAPI 3.0）
├── services/
│   ├── emailService.js   # 邮件发送
│   └── passwordReset.js  # 密码重置令牌
├── websocket/
│   ├── index.js          # WebSocket 服务器
│   ├── notificationService.js
│   └── messageQueue.js
└── data/
    └── todoist.db        # SQLite 数据库文件
```

## 数据库表结构

### users - 用户表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| email | TEXT UNIQUE | 邮箱 |
| name | TEXT | 用户名 |
| password_hash | TEXT | bcrypt 哈希 |
| role | TEXT | user / admin |
| plan | TEXT | free / business |
| balance | INTEGER | 余额（分） |
| plan_expires_at | TEXT | 套餐到期时间 |
| created_at | TEXT | 注册时间 |

### projects - 项目表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| user_id | TEXT FK | 所有者 |
| name | TEXT | 项目名 |
| color | TEXT | 颜色 |
| is_favorite | INTEGER | 收藏 |
| use_pomodoro | INTEGER | 番茄钟开关 |
| sort_order | INTEGER | 排序 |

### tasks - 任务表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| user_id | TEXT FK | 所属用户 |
| project_id | TEXT FK | 所属项目 |
| section_id | TEXT FK | 所属分组 |
| title | TEXT | 标题 |
| description | TEXT | 描述 |
| priority | TEXT | 优先级 |
| due_date | TEXT | 截止日期 |
| is_completed | INTEGER | 是否完成 |
| pomodoro_count | INTEGER | 番茄数 |
| labels | TEXT | 标签（JSON） |
| sort_order | INTEGER | 排序 |

### project_members - 项目成员表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| project_id | TEXT FK | 项目 |
| user_id | TEXT FK | 用户 |
| role | TEXT | owner/admin/member/viewer |
| invited_by | TEXT FK | 邀请人 |

## API 路由一览

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/auth/register | 注册 | 否 |
| POST | /api/auth/login | 登录 | 否 |
| GET | /api/auth/me | 当前用户 | 是 |
| POST | /api/auth/forgot-password | 忘记密码 | 否 |
| POST | /api/auth/reset-password | 重置密码 | 否 |
| GET/POST | /api/tasks | 任务列表/创建 | 是 |
| PUT/DELETE | /api/tasks/:id | 更新/删除 | 是 |
| GET/POST | /api/projects | 项目列表/创建 | 是 |
| PUT/DELETE | /api/projects/:id | 更新/删除 | 是 |
| GET | /api/projects/:id/shares | 成员列表 | 是 |
| POST | /api/projects/:id/share | 邀请成员 | 是 |
| PUT | /api/projects/:id/shares/:userId | 改角色 | 是 |
| DELETE | /api/projects/:id/shares/:userId | 移除成员 | 是 |
| POST | /api/ai/optimize-text | 文字优化 | 否 |
| POST | /api/ai/extract-image | 图片识别 | 否 |
| POST | /api/ai/organize | 目标分析 | 否 |
| GET | /api/admin/stats | 统计 | 是 |
| GET | /api/admin/users | 用户列表 | 是 |

## 环境变量 (.env)
```
PORT=3001
JWT_SECRET=你的密钥
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=你的邮箱
SMTP_PASS=授权码
SMTP_FROM=发件人
OPENAI_API_KEY=（可选）
AI_API_URL=（可选）
AI_MODEL=gpt-4o-mini
```

## 开发指南

### 添加新 API
1. 在 `routes/` 下创建新文件
2. 使用 `asyncHandler` 包装异步函数
3. 在 `index.js` 注册路由：`app.use('/api/xxx', require('./routes/xxx'))`
4. 需要认证的路由加 `authenticate` 中间件

### 数据库操作
```javascript
const { queryAll, queryOne, run } = require('../db');
// 查询多条
const users = queryAll('SELECT * FROM users');
// 查询单条
const user = queryOne('SELECT * FROM users WHERE id = ?', [id]);
// 执行
run('INSERT INTO users (id, email) VALUES (?, ?)', [id, email]);
```

### 部署
```bash
npm install
npm run build
pm2 start ecosystem.config.cjs
```
