# Todoist Clone 商用版数据库设计

## 表结构

### 1. users - 用户表
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. projects - 项目表
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  color VARCHAR(20) DEFAULT '#DC4C3E',
  is_favorite BOOLEAN DEFAULT false,
  use_pomodoro BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. sections - 版块表
```sql
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. tasks - 任务表
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 1,  -- 1=P4, 2=P3, 3=P2, 4=P1
  due_date DATE,
  labels TEXT[],  -- 数组存储标签ID
  planned_pomodoros INTEGER DEFAULT 0,
  completed_pomodoros INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5. labels - 标签表
```sql
CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT '#6B7280',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 6. comments - 评论表
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 7. pomodoro_sessions - 番茄钟会话表
```sql
CREATE TABLE pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  duration_minutes DECIMAL(5,2),
  completed BOOLEAN DEFAULT false,
  mode VARCHAR(20) DEFAULT 'focus',  -- focus, short_break, long_break
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 8. activity_logs - 活动日志表
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,  -- created, completed, deleted, etc.
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 索引
```sql
-- 用户相关
CREATE INDEX idx_users_email ON users(email);

-- 项目相关
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- 任务相关
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_is_completed ON tasks(is_completed);

-- 标签相关
CREATE INDEX idx_labels_user_id ON labels(user_id);

-- 评论相关
CREATE INDEX idx_comments_task_id ON comments(task_id);

-- 番茄钟相关
CREATE INDEX idx_pomodoro_sessions_task_id ON pomodoro_sessions(task_id);
CREATE INDEX idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);
CREATE INDEX idx_pomodoro_sessions_started_at ON pomodoro_sessions(started_at);
```

## API 端点设计

### 认证
- POST /api/auth/register - 注册
- POST /api/auth/login - 登录
- POST /api/auth/logout - 退出
- GET /api/auth/me - 获取当前用户

### 项目
- GET /api/projects - 获取所有项目
- POST /api/projects - 创建项目
- PUT /api/projects/:id - 更新项目
- DELETE /api/projects/:id - 删除项目

### 任务
- GET /api/tasks - 获取所有任务（支持过滤）
- POST /api/tasks - 创建任务
- PUT /api/tasks/:id - 更新任务
- DELETE /api/tasks/:id - 删除任务
- POST /api/tasks/:id/complete - 完成任务

### 标签
- GET /api/labels - 获取所有标签
- POST /api/labels - 创建标签
- PUT /api/labels/:id - 更新标签
- DELETE /api/labels/:id - 删除标签

### 评论
- GET /api/tasks/:id/comments - 获取任务评论
- POST /api/tasks/:id/comments - 添加评论
- DELETE /api/comments/:id - 删除评论

### 番茄钟
- POST /api/pomodoro/start - 开始番茄钟
- POST /api/pomodoro/pause - 暂停番茄钟
- POST /api/pomodoro/resume - 恢复番茄钟
- POST /api/pomodoro/stop - 停止番茄钟
- GET /api/pomodoro/sessions - 获取番茄钟记录

### 管理后台
- GET /api/admin/stats - 获取统计数据
- GET /api/admin/tasks - 获取所有任务（管理员）
- GET /api/admin/projects - 获取所有项目（管理员）
- GET /api/admin/users - 获取所有用户（管理员）
