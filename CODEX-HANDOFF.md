# Todoist Clone - Codex开发交接文档

> 生成时间: 2026-07-23
> 项目路径: `D:\360MoveData\Users\ww\Desktop\github项目文件\todoist-clone`
> GitHub: https://github.com/zelong117/todoist-clone.git
> 前端: React + Vite + Tailwind CSS + Zustand
> 后端: Express + SQLite
> 端口: 前端5173 / 后端3001

---

## 一、项目概览

这是一个商业级待办清单SaaS应用，功能包括：
- 任务管理（CRUD、优先级、标签、子任务、项目分组）
- 看板视图（拖拽排序列和任务）
- 日历视图
- 番茄钟计时器（含声音效果）
- AI助手侧边栏
- 管理后台（仪表盘、用户管理）
- 分享面板
- AI智能分类整理
- 快速捕捉（QuickCapture）
- 通知系统
- WebSocket实时通信

---

## 二、当前状态

### ✅ 已完成（可正常运行）
- 完整的前后端架构
- 用户认证（登录/注册/JWT）
- 任务CRUD + 看板拖拽 + 日历视图
- 番茄钟 + 音效系统
- 管理后台
- 132项自动化测试通过

### ⚠️ 正在开发：循环待办功能（部分完成）

前端已全部完成，后端差两处未提交。

### 完整文件结构
```
todoist-clone/
├── src/
│   ├── lib/
│   │   ├── recurrence.ts        ← 新建：循环规则引擎
│   │   ├── utils.ts
│   │   └── router.ts
│   ├── components/
│   │   ├── TaskDetail.tsx        ← 已修改：添加循环选择器UI
│   │   ├── TaskItem.tsx          ← 已修改：显示🔁图标
│   │   ├── QuickAdd.tsx
│   │   ├── BoardView.tsx
│   │   ├── CalendarView.tsx
│   │   ├── Sidebar.tsx
│   │   ├── AIAssistant.tsx
│   │   ├── AIOrganizer.tsx
│   │   ├── StatsView.tsx
│   │   ├── DraggableWidget.tsx
│   │   └── ... (其他组件)
│   ├── store.ts                  ← 已修改：toggleComplete含循环逻辑
│   ├── types.ts                  ← 已有isRecurring/recurrenceRule字段
│   ├── api.ts
│   ├── App.tsx
│   └── ...
├── server/
│   ├── index.js                  ← Express入口，端口3001
│   ├── db.js                     ← 已修改：tasks表加了is_recurring/recurrence_rule
│   ├── utils.js                  ← 已修改：mapTask含isRecurring/recurrenceRule
│   ├── routes/
│   │   └── tasks.js              ← ⚠️ 需修改：INSERT和UPDATE未包含循环字段
│   └── ...
└── package.json
```

---

## 三、循环待办功能 - 详细开发指南

### 已完成的部分

#### 1. `src/lib/recurrence.ts`（新建，214行）
循环规则解析引擎，支持：
- `daily` - 每天
- `weekly:6` - 每周六（0=周日, 1-6=周一到周六）
- `weekly:1,2,3,4,5` - 工作日
- `biweekly` - 每两周
- `monthly` / `monthly:15` - 每月/每月15号
- `yearly` - 每年
- `custom:3:d` / `custom:2:w` - 自定义间隔

函数：
- `parseRecurrenceRule(rule)` - 解析规则字符串
- `getNextDueDate(rule, completedDate, currentDate)` - 计算下一次到期日
- `formatRecurrenceRule(rule)` - 生成显示文字（如"🔁 每周六"）
- `RECURRENCE_OPTIONS` - 15种预设选项供UI选择

#### 2. `src/store.ts`（已修改，726行）
`toggleComplete`函数（第177行）已加入循环逻辑：
```typescript
// 如果是循环任务且正在被完成，生成下一个周期任务
if (!task.isCompleted && task.isRecurring && task.recurrenceRule) {
  const rule = parseRecurrenceRule(task.recurrenceRule);
  const nextDue = getNextDueDate(rule, completedDate, task.dueDate);
  // 创建新任务，标题相同，日期为下一个周期
  nextRecurrenceTask = { ...task, id: crypto.randomUUID(), dueDate: nextDue, isCompleted: false };
}
```

#### 3. `src/components/TaskDetail.tsx`（已修改，1032行）
在"截止"日期行后面添加了循环选择器UI：
- 显示当前循环状态（如"🔁 每周六"）
- 点击展开下拉菜单，15种预设选项
- 可取消循环

#### 4. `src/components/TaskItem.tsx`（已修改）
在日期标签旁显示🔁循环图标

#### 5. `server/db.js`（已修改）
tasks表已有：
```sql
is_recurring INTEGER DEFAULT 0,
recurrence_rule TEXT,
```

#### 6. `server/utils.js`（已修改）
mapTask已包含：
```javascript
isRecurring: !!row.is_recurring,
recurrenceRule: row.recurrence_rule || null,
```

### ⚠️ 需要完成的部分

#### 1. `server/routes/tasks.js` - INSERT语句（第157行）
当前：
```javascript
run('INSERT INTO tasks (id, user_id, project_id, section_id, parent_id, title, priority, due_date, labels, planned_pomodoros, estimated_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [id, req.user.id, ...]);
```
需要改为：
```javascript
run('INSERT INTO tasks (id, user_id, project_id, section_id, parent_id, title, priority, due_date, labels, planned_pomodoros, estimated_minutes, is_recurring, recurrence_rule, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [id, req.user.id, nullableId(projectId), nullableId(sectionId), nullableId(parentId), title.trim(), priority || 1, dueDate || null, JSON.stringify(Array.isArray(labels) ? labels : []), pp, pp * 25, isRecurring ? 1 : 0, recurrenceRule || null, now, now]);
```

#### 2. `server/routes/tasks.js` - allowed字段（第180行）
当前：
```javascript
const allowed = ['title', 'description', 'isCompleted', 'completedAt', 'priority', 'dueDate', 'labels', 'plannedPomodoros', 'completedPomodoros', 'pomodoroCount', 'estimatedMinutes', 'sortOrder', 'projectId', 'sectionId', 'parentId'];
```
需要添加 `'isRecurring', 'recurrenceRule'`

#### 3. `server/routes/tasks.js` - INSERT的req.body解构
在创建任务的路由中（约153行），需要从req.body中提取：
```javascript
const { title, priority, dueDate, labels, projectId, sectionId, parentId, plannedPomodoros, isRecurring, recurrenceRule } = req.body;
```

#### 4. 已有数据库ALTER TABLE
如果有已存在的数据库（`server/data/`目录下的.db文件），需要执行：
```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
```
注意：SQLite不支持`IF NOT EXISTS`的ALTER TABLE，需要用try-catch包裹。

#### 5. tasks.js的UPDATE逻辑
在PUT路由的sanitized处理中，需要将`isRecurring`和`recurrenceRule`映射为数据库字段名：
```javascript
if (sanitized.isRecurring !== undefined) {
  run('UPDATE tasks SET is_recurring = ?, updated_at = ? WHERE id = ?', [sanitized.isRecurring ? 1 : 0, new Date().toISOString(), req.params.id]);
}
if (sanitized.recurrenceRule !== undefined) {
  run('UPDATE tasks SET recurrence_rule = ?, updated_at = ? WHERE id = ?', [sanitized.recurrenceRule, new Date().toISOString(), req.params.id]);
}
```

---

## 四、验证步骤

完成后，按以下步骤验证：

1. `cd server && npm start` - 启动后端
2. `cd .. && npm run dev` - 启动前端
3. 注册/登录
4. 创建任务，设为"每周六"
5. 完成该任务
6. 检查是否自动生成了下一个周六的新任务
7. 确认🔁图标在任务列表中显示

---

## 五、运行方式

```bash
# 后端
cd server && npm start    # 端口3001

# 前端
npm run dev               # 端口5173
```

测试账号：test2@test.com / 12345678

---

## 六、项目约定

- 状态管理：Zustand + persist middleware（localStorage）
- UI风格：暗色主题，Tailwind CSS
- API认证：JWT Bearer token
- 任务ID：UUID v4
- 日期格式：ISO 8601字符串
- 数据库：SQLite（`server/data/`目录）
- WebSocket通知：任务创建/更新/删除实时推送
