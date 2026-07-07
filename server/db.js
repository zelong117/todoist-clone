const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'todoist.db');

let db = null;
let inTransaction = false;

async function initDB() {
  const SQL = await initSqlJs();

  // Load existing DB or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#DC4C3E',
      is_favorite INTEGER DEFAULT 0,
      use_pomodoro INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT,
      section_id TEXT,
      parent_id TEXT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority INTEGER DEFAULT 1,
      due_date TEXT,
      is_completed INTEGER DEFAULT 0,
      completed_at TEXT,
      labels TEXT DEFAULT '[]',
      planned_pomodoros INTEGER DEFAULT 1,
      completed_pomodoros INTEGER DEFAULT 0,
      pomodoro_count INTEGER DEFAULT 0,
      estimated_minutes INTEGER DEFAULT 25,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS labels (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6B7280'
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      user_id TEXT NOT NULL,
      mode TEXT DEFAULT 'focus',
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_minutes REAL DEFAULT 0,
      completed INTEGER DEFAULT 0
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS filters (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      query TEXT NOT NULL,
      is_builtin INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT,
      type TEXT NOT NULL,
      severity TEXT DEFAULT 'info',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, task_id, type)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, sort_order)');
  db.run('CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, sort_order)');
  db.run('CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(user_id, project_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(user_id, parent_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_pomodoro_user_open ON pomodoro_sessions(user_id, ended_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_pomodoro_task ON pomodoro_sessions(user_id, task_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_filters_user ON filters(user_id, sort_order)');
  db.run('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id, created_at)');

  // 项目成员表（共享/群组）
  db.run(`
    CREATE TABLE IF NOT EXISTS project_members (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      invited_by TEXT,
      joined_at TEXT DEFAULT (datetime('now')),
      UNIQUE(project_id, user_id)
    );
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id)');

  // 附件表
  db.run(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      mimetype TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_attachments_task ON attachments(task_id)');

  // 用户表追加字段（安全添加）
  try { db.run('ALTER TABLE users ADD COLUMN avatar_url TEXT'); } catch {}
  try { db.run('ALTER TABLE users ADD COLUMN settings TEXT'); } catch {}

  // 团队表
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      owner_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at TEXT DEFAULT (datetime('now')),
      UNIQUE(team_id, user_id)
    );
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id)');

  saveDB();
  console.log('鉁?Database initialized:', DB_PATH);
  return db;
}

function saveDB() {
  if (!db) return;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const data = db.export();
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, Buffer.from(data));
  fs.renameSync(tmpPath, DB_PATH);
}

// Wrapper: run a query and return all rows
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Wrapper: run a query and return first row
function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Wrapper: run INSERT/UPDATE/DELETE
function run(sql, params = []) {
  db.run(sql, params);
  if (!inTransaction) saveDB();
}

function transaction(fn) {
  if (inTransaction) return fn();
  inTransaction = true;
  db.run('BEGIN');
  try {
    const result = fn();
    db.run('COMMIT');
    saveDB();
    return result;
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  } finally {
    inTransaction = false;
  }
}

// Wrapper: get last insert rowid
function getLastInsertId() {
  const row = queryOne('SELECT last_insert_rowid() as id');
  return row ? row.id : null;
}

module.exports = { initDB, queryAll, queryOne, run, transaction, saveDB, getLastInsertId };


