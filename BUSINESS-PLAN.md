# Todoist Clone 商业化计划书

> 版本：v1.0 | 日期：2026-07-04

---

## 目录

1. [项目现状概览](#1-项目现状概览)
2. [技术架构升级路径](#2-技术架构升级路径)
3. [功能差异化策略](#3-功能差异化策略)
4. [商业模式设计](#4-商业模式设计)
5. [技术债务评估与重构路线](#5-技术债务评估与重构路线)
6. [实施路线图](#6-实施路线图)
7. [风险与应对](#7-风险与应对)

---

## 1. 项目现状概览

### 1.1 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React + TypeScript | React 19 / TS 6.0 |
| 构建工具 | Vite | 8.x |
| 状态管理 | Zustand | 5.x |
| UI 组件 | Tailwind CSS 4 + shadcn/ui | 4.x |
| 后端框架 | Express.js | 4.x |
| 数据库 | SQLite (sql.js) | 1.x |
| 认证 | JWT + bcryptjs | - |
| 代码检查 | oxlint | 1.x |

### 1.2 已实现功能

- ✅ 任务 CRUD（标题、描述、优先级 P1-P4、截止日期、标签、子任务）
- ✅ 项目管理（创建、编辑、删除、颜色标记、收藏）
- ✅ 视图模式（列表、看板、日历）
- ✅ 智能视图（收件箱、今天、即将到来）
- ✅ 番茄钟计时器（自定义时长、自动休息、统计）
- ✅ 过滤器与标签系统
- ✅ 拖拽排序（@dnd-kit）
- ✅ 用户认证（注册/登录/JWT）
- ✅ 管理后台（统计概览）
- ✅ 评论系统
- ✅ 活动日志
- ✅ 暗色模式

### 1.3 当前架构问题

| 问题 | 严重程度 | 影响 |
|------|----------|------|
| SQLite 文件存储 | 🔴 高 | 不支持并发写入，无法水平扩展 |
| 内存 Map 存储（部分路由） | 🔴 高 | 重启丢失数据 |
| 缺少数据隔离检查 | 🔴 高 | 跨用户数据泄漏风险 |
| 无输入验证一致性 | 🟡 中 | 安全隐患 |
| 前端硬编码 API URL | 🟡 中 | 部署灵活性差 |
| 零测试覆盖 | 🔴 高 | 重构/发布风险极高 |
| 无 CI/CD | 🟡 中 | 手动部署易出错 |

---

## 2. 技术架构升级路径

### 2.1 数据库迁移：SQLite → PostgreSQL

**迁移分三阶段执行：**

#### 阶段 1：准备期（第 1-2 周）

```
SQLite (当前) ──→ 数据访问层抽象 ──→ PostgreSQL
```

1. **引入 ORM**：使用 Prisma 替代原始 SQL 查询
   - 类型安全的数据库操作
   - 自动生成迁移文件
   - 内置连接池管理

2. **Prisma Schema 设计**（对应现有表结构）：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String
  passwordHash String   @map("password_hash")
  avatarUrl    String?  @map("avatar_url")
  role         String   @default("user")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  projects         Project[]
  tasks            Task[]
  labels           Label[]
  comments         Comment[]
  pomodoroSessions PomodoroSession[]
  activityLogs     ActivityLog[]

  @@map("users")
}

model Project {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  name       String
  color      String   @default("#DC4C3E")
  isFavorite Boolean  @default(false) @map("is_favorite")
  usePomodoro Boolean @default(false) @map("use_pomodoro")
  sortOrder  Int      @default(0) @map("sort_order")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  sections Section[]
  tasks    Task[]

  @@index([userId])
  @@map("projects")
}

model Task {
  id                 String    @id @default(uuid())
  userId             String    @map("user_id")
  projectId          String?   @map("project_id")
  sectionId          String?   @map("section_id")
  parentId           String?   @map("parent_id")
  title              String
  description        String?   @default("")
  priority           Int       @default(1)
  dueDate            DateTime? @map("due_date")
  isCompleted        Boolean   @default(false) @map("is_completed")
  completedAt        DateTime? @map("completed_at")
  labels             String[]  @default([])
  plannedPomodoros   Int       @default(1) @map("planned_pomodoros")
  completedPomodoros Int       @default(0) @map("completed_pomodoros")
  estimatedMinutes   Int       @default(25) @map("estimated_minutes")
  sortOrder          Int       @default(0) @map("sort_order")
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")

  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  project          Project?          @relation(fields: [projectId], references: [id], onDelete: SetNull)
  section          Section?          @relation(fields: [sectionId], references: [id], onDelete: SetNull)
  parent           Task?             @relation("Subtasks", fields: [parentId], references: [id], onDelete: Cascade)
  children         Task[]            @relation("Subtasks")
  comments         Comment[]
  pomodoroSessions PomodoroSession[]

  @@index([userId])
  @@index([projectId])
  @@index([dueDate])
  @@index([isCompleted])
  @@map("tasks")
}

model Section {
  id        String   @id @default(uuid())
  projectId String   @map("project_id")
  name      String
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks   Task[]

  @@map("sections")
}

model Label {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  name      String
  color     String   @default("#6B7280")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("labels")
}

model Comment {
  id        String   @id @default(uuid())
  taskId    String   @map("task_id")
  userId    String   @map("user_id")
  content   String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([taskId])
  @@map("comments")
}

model PomodoroSession {
  id             String    @id @default(uuid())
  taskId         String?   @map("task_id")
  userId         String    @map("user_id")
  mode           String    @default("focus")
  startedAt      DateTime  @map("started_at")
  endedAt        DateTime? @map("ended_at")
  durationMinutes Decimal? @map("duration_minutes")
  completed      Boolean   @default(false)
  createdAt      DateTime  @default(now()) @map("created_at")

  task Task? @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([taskId])
  @@index([userId])
  @@index([startedAt])
  @@map("pomodoro_sessions")
}

model ActivityLog {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  taskId    String?  @map("task_id")
  action    String
  details   Json?
  createdAt DateTime @default(now()) @map("created_at")

  user User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  task Task? @relation(fields: [taskId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@map("activity_logs")
}
```

#### 阶段 2：数据迁移（第 3 周）

1. 编写 SQLite → PostgreSQL 数据导出脚本
2. 字段映射转换（TEXT 日期 → TIMESTAMP，INTEGER 布尔 → BOOLEAN）
3. UUID 格式统一（当前使用 `uuid` 库生成，保持兼容）
4. 迁移验证：数据完整性校验

#### 阶段 3：切换上线（第 4 周）

1. 灰度切换：双写模式（同时写入 SQLite 和 PostgreSQL）
2. 数据比对确认无误后，切换为主库
3. 移除 SQLite 相关代码

### 2.2 微服务架构设计

**当前为单体应用，建议渐进式拆分为以下服务：**

```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway (Nginx)                   │
│              负载均衡 / SSL 终止 / 路由                   │
└──────┬──────────┬──────────┬──────────┬─────────────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
┌──────────┐┌──────────┐┌──────────┐┌──────────┐
│ Auth     ││ Task     ││ Pomodoro ││ AI       │
│ Service  ││ Service  ││ Service  ││ Service  │
│ (Node.js)││ (Node.js)││ (Node.js)││ (Python) │
└────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘
     │           │           │           │
     ▼           ▼           ▼           ▼
┌──────────────────────────────────────────────┐
│           PostgreSQL (主从复制)                │
│           Redis (缓存/会话/队列)              │
└──────────────────────────────────────────────┘
```

**各服务职责：**

| 服务 | 职责 | 端口 |
|------|------|------|
| API Gateway | 路由分发、限流、日志 | 80/443 |
| Auth Service | 注册/登录/JWT/权限/OAuth | 3001 |
| Task Service | 任务/项目/标签/评论 CRUD | 3002 |
| Pomodoro Service | 番茄钟会话/统计 | 3003 |
| AI Service | 智能建议/任务分析 | 5000 |
| Notification Service | WebSocket/邮件/推送 | 3004 |
| Frontend (SPA) | React 静态资源 | 由 Nginx 托管 |

**服务间通信：**
- 同步：REST API（通过 API Gateway 路由）
- 异步：Redis Pub/Sub 或 BullMQ 消息队列（用于通知、AI 分析）

### 2.3 容器化部署方案

#### Dockerfile（后端服务）

```dockerfile
# server/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS runtime
COPY . .
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3001/api/health || exit 1
CMD ["node", "index.js"]
```

#### Dockerfile（前端）

```dockerfile
# Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  # PostgreSQL
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: todoist
      POSTGRES_USER: todoist
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U todoist"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

  # Auth Service
  auth:
    build: ./server
    environment:
      - DATABASE_URL=postgresql://todoist:${DB_PASSWORD}@db:5432/todoist
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - SERVICE_NAME=auth
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  # Task Service
  task:
    build: ./server
    environment:
      - DATABASE_URL=postgresql://todoist:${DB_PASSWORD}@db:5432/todoist
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - SERVICE_NAME=task
    depends_on:
      db:
        condition: service_healthy

  # Frontend
  web:
    build: .
    ports:
      - "80:80"
    depends_on:
      - auth
      - task

volumes:
  pgdata:
  redisdata:
```

### 2.4 CI/CD 流程设计

**推荐 GitHub Actions：**

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # ===== 代码质量检查 =====
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - name: TypeScript Check
        run: npx tsc --noEmit

  # ===== 单元测试 =====
  test-unit:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - name: Upload Coverage
        uses: codecov/codecov-action@v4

  # ===== 集成测试 =====
  test-integration:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: todoist_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd server && npm ci
      - run: cd server && npm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/todoist_test

  # ===== 构建 =====
  build:
    runs-on: ubuntu-latest
    needs: [test-unit, test-integration]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  # ===== 部署（仅 main 分支） =====
  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          # 替换为实际部署命令
          docker compose build
          docker compose push
          # kubectl apply / fly deploy / railway up
```

---

## 3. 功能差异化策略

### 3.1 竞品对比分析

| 功能维度 | Todoist | TickTick | 滴答清单 | **本项目（目标）** |
|----------|---------|----------|----------|-------------------|
| 基础任务管理 | ✅ | ✅ | ✅ | ✅ |
| 看板视图 | ✅ | ✅ | ✅ | ✅ |
| 日历视图 | ❌ | ✅ | ✅ | ✅ |
| 番茄钟 | ❌ | ✅ | ✅ | ✅ **内置** |
| AI 功能 | ✅ (AI Assistant) | ❌ | ❌ | ✅ **深度集成** |
| 自然语言输入 | ✅ | ✅ | ✅ | ✅ |
| 离线优先 | ✅ | ✅ | ✅ | ✅ (localStorage fallback) |
| 开源自部署 | ❌ | ❌ | ❌ | ✅ **核心优势** |
| 价格 | $4-9/月 | $35.99/年 | ¥139/年 | **Freemium** |
| API 开放度 | 一般 | 一般 | 一般 | ✅ **完全开放** |
| 中文本地化 | 一般 | 好 | 原生 | ✅ 原生中文优先 |

### 3.2 独特卖点（USP）

#### USP 1：AI-Native 任务管理

不只是"有 AI 功能"，而是**AI 贯穿整个工作流**：

- **智能任务创建**：输入自然语言，AI 自动解析出标题、截止日期、优先级、标签
  - 示例：`"下周五前完成Q3报告 P2 工作"` → 自动提取日期、优先级、标签
- **智能优先级建议**：基于截止日期、历史完成模式、任务描述自动推荐优先级
- **每日聚焦推荐**：AI 分析你的任务列表，推荐今日应聚焦的 3-5 个关键任务
- **工作量预估**：基于历史番茄钟数据，AI 预估新任务所需时间

#### USP 2：番茄钟深度集成

区别于其他工具将番茄钟作为独立模块，本项目实现**任务-番茄钟一体化**：

- 任务直接绑定番茄钟计划
- 实时显示任务进度（已用/计划番茄数）
- 基于番茄钟数据的深度生产力分析
- 番茄钟完成自动推进任务状态

#### USP 3：开发者友好 + 开源

- 完整 REST API + WebSocket API
- Webhook 支持
- 自部署方案（Docker 一键部署）
- 插件系统（计划中）

#### USP 4：中国市场本地化

- 原生中文界面，非翻译体
- 支持中文自然语言日期解析
- 符合国内数据合规要求
- 支持微信/钉钉通知集成

### 3.3 AI 功能集成方案

**技术架构：**

```
前端 → Task Service → AI Service (Python/FastAPI)
                          ↓
                   OpenAI API / 本地 LLM
```

**AI 功能模块：**

| 功能 | 实现方式 | 优先级 |
|------|----------|--------|
| 智能任务解析 | NLP 实体提取（日期/优先级/标签） | P0 |
| 优先级建议 | 基于规则 + LLM 结合 | P1 |
| 每日推荐 | LLM 分析任务列表，输出 Top-N | P1 |
| 工作量预估 | 历史数据回归模型 | P2 |
| 任务描述增强 | LLM 生成子任务建议 | P2 |
| 周报生成 | 聚合完成任务 → LLM 生成总结 | P3 |

**AI 服务示例（FastAPI）：**

```python
# ai-service/main.py
from fastapi import FastAPI
from pydantic import BaseModel
import openai

app = FastAPI(title="Todoist Clone AI Service")

class TaskParseRequest(BaseInput):
    text: str  # "下周五前完成Q3报告 P2 工作"

class TaskParseResponse(BaseModel):
    title: str
    due_date: str | None
    priority: int
    labels: list[str]

@app.post("/api/ai/parse-task", response_model=TaskParseResponse)
async def parse_task(req: TaskParseRequest):
    """自然语言 → 结构化任务"""
    response = await openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": TASK_PARSE_PROMPT},
            {"role": "user", "content": req.text}
        ],
        response_format={"type": "json_object"}
    )
    return TaskParseResponse(**response.choices[0].message.parsed)

@app.post("/api/ai/daily-focus")
async def daily_focus(user_id: str):
    """每日聚焦推荐"""
    tasks = await get_user_tasks(user_id)
    # ... LLM 分析
    return {"recommended_tasks": [...]}
```

---

## 4. 商业模式设计

### 4.1 Freemium 策略

**核心理念：** 免费版足够好用，付费版让人不想回去。

| 功能 | 免费版 | Pro 版 ($4.99/月) | 团队版 ($8.99/人/月) | 企业版 (定制) |
|------|--------|-------------------|---------------------|--------------|
| 项目数量 | 5 个 | 无限 | 无限 | 无限 |
| 任务数量 | 200 个 | 无限 | 无限 | 无限 |
| 标签数量 | 10 个 | 无限 | 无限 | 无限 |
| 看板视图 | ✅ | ✅ | ✅ | ✅ |
| 日历视图 | ✅ | ✅ | ✅ | ✅ |
| 番茄钟 | ✅ 基础 | ✅ 高级统计 | ✅ 高级统计 | ✅ 高级统计 |
| AI 功能 | 10次/天 | 无限 | 无限 | 无限 + 自定义模型 |
| 自然语言输入 | ✅ | ✅ | ✅ | ✅ |
| 数据导出 | ❌ | ✅ | ✅ | ✅ |
| 自动化规则 | ❌ | 10 条 | 无限 | 无限 |
| 团队协作 | ❌ | ❌ | ✅ | ✅ |
| 管理后台 | ❌ | ❌ | ✅ | ✅ |
| SSO | ❌ | ❌ | ❌ | ✅ |
| API 访问 | 100次/天 | 1000次/天 | 5000次/天 | 无限 |
| 存储空间 | 100MB | 5GB | 20GB | 自定义 |
| 优先支持 | ❌ | 邮件 | 邮件+聊天 | 专属客户经理 |
| SLA | ❌ | 99.5% | 99.9% | 99.99% |

### 4.2 定价方案设计

```
免费版                    Pro 版                团队版               企业版
¥0/永久                   ¥39/月               ¥69/人/月            联系销售
                           ¥299/年 (省37%)      ¥528/人/年 (省36%)
适合个人轻度使用           适合个人重度使用       适合小团队            适合大型组织
```

**定价策略要点：**

1. **年付折扣 30-40%**：鼓励长期订阅
2. **教育优惠**：学生/教师 5 折
3. **开源贡献者优惠**：为项目贡献代码的用户享 Pro 版免费
4. **推荐奖励**：推荐好友注册，双方各获 1 个月 Pro

### 4.3 企业版功能规划

| 功能模块 | 描述 |
|----------|------|
| SSO/SAML | 企业单点登录集成 |
| 审计日志 | 完整操作审计追踪 |
| 数据驻留 | 数据存储区域选择 |
| 自定义域名 | 企业专属域名部署 |
| API 限流提升 | 高频 API 调用支持 |
| 专属支持 | 7×24 技术支持 + 客户成功经理 |
| 自定义集成 | Webhook + 自定义插件开发 |
| 批量管理 | CSV 批量导入/导出用户和任务 |
| 权限管理 | 细粒度角色权限控制 |
| 合规报告 | 数据合规审计报告 |

---

## 5. 技术债务评估与重构路线

### 5.1 当前代码质量评分

| 维度 | 评分 | 说明 |
|------|------|------|
| **代码结构** | 7/10 | 前后端分离清晰，组件拆分合理 |
| **类型安全** | 6/10 | 前端 TypeScript 类型定义完整；后端纯 JS 无类型 |
| **安全性** | 4/10 | 存在数据隔离漏洞、输入验证不一致、内存存储 |
| **测试覆盖** | 1/10 | 零测试 |
| **可扩展性** | 3/10 | SQLite 不可扩展、单体架构 |
| **文档** | 6/10 | 有 README、FEATURES.md、DATABASE-DESIGN.md |
| **CI/CD** | 2/10 | 仅有 oxlint，无自动化测试/部署 |
| **性能** | 5/10 | 前端性能良好；后端缺少缓存、索引优化 |
| **综合** | **4.25/10** | MVP 水平，距离商用需大量改进 |

### 5.2 重构优先级

#### P0 — 安全性（立即处理）

```
[ ] 修复 admin 路由缺少角色检查
[ ] 修复 comments/tasks 数据隔离漏洞（跨用户读取）
[ ] 将内存 Map 存储迁移到 SQLite（至少持久化）
[ ] 统一输入验证（Joi schema 覆盖所有路由）
[ ] 添加 rate limiting 到所有 API 端点（不仅是 auth）
```

#### P1 — 数据层（第 1-4 周）

```
[ ] 引入 Prisma ORM
[ ] 迁移到 PostgreSQL
[ ] 添加数据库索引
[ ] 实现连接池
[ ] 添加数据库迁移管理
```

#### P2 — 测试（第 2-6 周）

```
[ ] 后端单元测试（Jest）→ 目标覆盖率 80%
[ ] 前端组件测试（Vitest + Testing Library）→ 目标覆盖率 70%
[ ] API 集成测试 → 关键路径 100%
[ ] E2E 测试（Playwright）→ 核心用户流程
```

#### P3 — 后端现代化（第 4-8 周）

```
[ ] 后端 TypeScript 化
[ ] 引入 Express 中间件：错误处理、请求日志、健康检查
[ ] 统一响应格式
[ ] API 版本化（/api/v1/）
[ ] OpenAPI/Swagger 文档自动生成
```

#### P4 — 前端优化（第 6-10 周）

```
[ ] API URL 环境变量化
[ ] 添加 React Query / SWR 数据获取层
[ ] 错误边界 + 全局错误处理
[ ] 性能优化：虚拟列表、懒加载
[ ] PWA 支持（离线可用 + 安装提示）
```

#### P5 — DevOps（第 8-12 周）

```
[ ] Docker 化前端和后端
[ ] GitHub Actions CI/CD
[ ] 环境管理（dev/staging/prod）
[ ] 日志收集（ELK 或 Loki）
[ ] 监控告警（Prometheus + Grafana）
```

### 5.3 测试覆盖率目标

| 阶段 | 目标 | 工具 |
|------|------|------|
| 当前 | 0% | - |
| 阶段 1（4周） | 后端 60% | Jest |
| 阶段 2（8周） | 后端 80%，前端 50% | Jest + Vitest |
| 阶段 3（12周） | 后端 85%，前端 70%，E2E 核心路径 | + Playwright |
| 持续 | 后端 85%+，前端 75%+，E2E 关键流程 | CI 门禁 |

---

## 6. 实施路线图

### 第一阶段：安全加固 + MVP 商用（第 1-4 周）

```
Week 1-2:  修复安全漏洞（数据隔离、输入验证、角色检查）
Week 2-3:  迁移到 PostgreSQL + Prisma
Week 3-4:  基础 CI/CD + Docker 部署
Week 4:    上线 beta 版本（邀请制）
```

### 第二阶段：功能增强 + AI 集成（第 5-12 周）

```
Week 5-6:  AI 服务开发（任务解析、优先级建议）
Week 7-8:  测试体系建设（单元测试 + 集成测试）
Week 9-10: 团队协作功能基础版
Week 11-12: 付费系统集成（Stripe/支付宝）
```

### 第三阶段：商业化运营（第 13-24 周）

```
Week 13-16: 公开发布 + 市场推广
Week 17-20: 企业版功能开发
Week 21-24: 移动端适配 / PWA / 原生 App 评估
```

### 关键里程碑

| 时间点 | 里程碑 | 成功指标 |
|--------|--------|----------|
| 第 4 周 | Beta 版上线 | 50 内测用户 |
| 第 8 周 | AI 功能上线 | AI 功能使用率 > 30% |
| 第 12 周 | 付费版上线 | 首月 100 付费用户 |
| 第 16 周 | 公开发布 | 1000 注册用户 |
| 第 24 周 | 企业版上线 | 首个企业客户 |

---

## 7. 风险与应对

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|----------|
| Todoist 法律风险 | 中 | 高 | 确保不使用 Todoist 商标/品牌，UI 设计差异化 |
| PostgreSQL 迁移数据丢失 | 低 | 高 | 双写验证 + 完整数据备份 + 回滚方案 |
| AI API 成本过高 | 高 | 中 | 限制免费版调用次数；考虑本地小模型；缓存常用结果 |
| 用户增长缓慢 | 中 | 中 | 开源社区运营 + 开发者生态 + 内容营销 |
| 竞品跟进 AI 功能 | 高 | 中 | 深耕番茄钟+AI 的独特结合，建立数据壁垒 |
| 安全事故 | 低 | 高 | 定期安全审计 + Bug Bounty 计划 + 渗透测试 |

---

## 附录：成本估算

### 基础设施月成本（1000 用户规模）

| 项目 | 规格 | 月成本（美元） |
|------|------|--------------|
| 云服务器（2台） | 2C4G | $40 |
| PostgreSQL 托管 | 2C4G 50GB | $30 |
| Redis 托管 | 1G | $15 |
| AI API (OpenAI) | ~50K tokens/天 | $30 |
| 域名 + SSL | - | $2 |
| CDN | Cloudflare 免费 | $0 |
| 监控 | Grafana Cloud 免费版 | $0 |
| **合计** | | **~$117/月** |

### 预期收入（1000 用户）

| 用户类型 | 数量 | 单价 | 月收入 |
|----------|------|------|--------|
| 免费用户 | 850 | $0 | $0 |
| Pro 用户 | 120 | $5 | $600 |
| 团队用户 | 30 (×3人) | $9/人 | $810 |
| **合计** | | | **$1,410/月** |

**盈亏平衡点：约 85 个付费用户（~200 注册用户）**

---

*本文档将随项目演进持续更新。*
