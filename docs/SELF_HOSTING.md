# 24/7 Self Hosting

This repo can run as one production Node server: the root build emits `dist/`, and `server/index.js` serves it when `NODE_ENV=production`.

## Build

```powershell
cd "D:\360MoveData\Users\ww\Desktop\github项目文件\todoist-clone"
npm.cmd install
npm.cmd run build
cd server
npm.cmd install --omit=dev
```

## Run Manually

```powershell
cd "D:\360MoveData\Users\ww\Desktop\github项目文件\todoist-clone\server"
$env:NODE_ENV="production"
$env:PORT="3001"
$env:CORS_ORIGIN="http://localhost:3001"
node index.js
```

Health check: `http://localhost:3001/api/health`.

## Windows Scheduled Task

Use Task Scheduler with:

- Program: `C:\Program Files\nodejs\node.exe`
- Arguments: `index.js`
- Start in: `D:\360MoveData\Users\ww\Desktop\github项目文件\todoist-clone\server`
- Trigger: At startup
- Settings: restart every 1 minute, attempt 999 times

Store production values in `server/.env.production` and copy them to `server/.env` before starting.

## Data and Backups

SQLite data lives at `server/data/todoist.db`. Back up that file while the server is stopped, or copy it after hitting low-traffic hours. Keep at least one daily and one weekly copy.

## Operational Boundaries

- Logs are operational events and task history: use `/api/insights/activity`.
- Statistics are computed snapshots: use `/api/insights/stats` or `/api/admin/stats`.
- Notifications are persisted bell items: use `/api/notifications`.
- Filters are saved cross-cutting task queries: use `/api/filters`; Inbox/Today/Upcoming remain navigation buckets.
