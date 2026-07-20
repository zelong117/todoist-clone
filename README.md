# Todoist Clone

任务管理应用 — React + TypeScript + Vite 前端，Node.js + Express + SQLite 后端。

## 快速启动

```bash
# 1. 安装依赖
cd server && npm install && cd ..
npm install

# 2. 配置环境变量
cp server/.env.example server/.env
# 编辑 server/.env，至少修改 JWT_SECRET

# 3. 启动后端
cd server && node index.js

# 4. 启动前端（新终端）
npx vite --host
```

访问 http://localhost:5173

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS v4 |
| 状态 | Zustand + localStorage persist |
| 后端 | Node.js + Express + SQLite (sql.js) |
| 认证 | JWT + bcrypt |
| 实时 | WebSocket |

## 目录结构

```
src/                  # 前端源码
  App.tsx             # 入口
  store.ts            # 状态管理
  api.ts              # API 层
  components/         # 组件
  pages/              # 页面
  contexts/           # Context
server/               # 后端源码
  index.js            # 入口
  db.js               # 数据库
  routes/             # API 路由
  middleware/          # 中间件
  data/todoist.db     # SQLite 数据库文件
```

## 环境变量

参见 `server/.env.example`。

必填：
- `JWT_SECRET` — 登录 token 签名密钥

可选：
- `SMTP_*` — 邮件功能
- `OPENAI_API_KEY` — AI 功能

## 测试

```bash
cd server && npm test
```

## 数据库

数据库文件位于 `server/data/todoist.db`，SQLite 格式。

备份：直接复制该文件即可。
重置：删除该文件后重启服务，会自动重建。

## 部署

```bash
# 生产构建
npm run build

# PM2 启动
pm2 start ecosystem.config.cjs
```

## 许可证

私有项目。
