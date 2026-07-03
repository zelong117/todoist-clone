# CODEX Security & Quality Review

## 1) Security Issues

| Severity | File | Issue | Fix Suggestion |
|----------|------|-------|----------------|
| **CRITICAL** | `server/middleware/auth.js:3` | Hardcoded JWT secret fallback (`'todoist-clone-secret-key-2024'`). If `JWT_SECRET` env var is not set, anyone who reads the source can forge valid JWTs. | Remove fallback — crash at startup if `JWT_SECRET` is missing: `if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET required')` |
| **CRITICAL** | `server/routes/admin.js:18-22` | `/admin/users` endpoint has no admin role check. Any authenticated user can access it. | Add role-based middleware that verifies `req.user.role === 'admin'` before returning data. |
| **HIGH** | `server/routes/comments.js:8-16` | `GET /tasks/:taskId/comments` returns all comments for the given `taskId` without filtering by `req.user.id` — any user can read comments on any task. | Add `comment.userId === req.user.id` filter to the loop. |
| **HIGH** | `server/routes/comments.js:18-36` | `POST /tasks/:taskId/comments` does not verify that the `taskId` belongs to `req.user.id`. A user can add comments to any task. | Look up the task (from `tasks.js` Map or a shared data layer) and reject if `task.userId !== req.user.id`. |
| **HIGH** | `server/routes/tasks.js:59-65`, `server/routes/projects.js:47-52`, `server/routes/labels.js:44-49` | Mass-assignment via `...req.body` — whitelist only `id` and `userId` after the spread; fields like `createdAt` and `updatedAt` can be overwritten by the client. | Use a pick/whitelist helper (e.g., `pick(req.body, ['title','description','priority','dueDate','labels','plannedPomodoros','color','name','isFavorite','usePomodoro','content'])`) instead of raw spread. |
| **HIGH** | `server/index.js:12` | `cors()` called with no options — allows all origins, methods, and headers in production. | Restrict to known origins: `cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' })` |
| **HIGH** | `server/routes/auth.js:12-59` | No rate limiting on `/register` or `/login` — vulnerable to brute-force and account enumeration attacks. | Add `express-rate-limit` middleware (e.g., 5 attempts per 15 min on `/login`). |
| **HIGH** | `server/index.js:13` | `express.json()` with no `limit` option — attackers can send arbitrarily large payloads to exhaust memory. | Set a size limit: `express.json({ limit: '10kb' })` |
| **MEDIUM** | `server/routes/auth.js:43,92` | JWT payload includes `email` (PII) — if the token is intercepted, the user's email is leaked. | Keep only `{ id }` in the JWT; fetch user details from the data layer on each request. |
| **MEDIUM** | `server/routes/auth.js:16` | No email format validation — users can register with invalid emails like `"not-an-email"`. | Add a regex validator (e.g., `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) before processing the request. |
| **MEDIUM** | `server/routes/auth.js:16` | No password strength validation — users can set weak passwords (e.g., `"123"`). | Enforce minimum length (≥ 8) and optionally complexity rules. |
| **MEDIUM** | `server/routes/tasks.js:38`, `server/routes/projects.js:30`, `server/routes/labels.js:29`, `server/routes/comments.js:22` | No max-length validation on `title`, `name`, `content` — allows DoS via very long strings. | Add length checks: `if (title.length > 200) return res.status(400)...` |

## 2) Missing Validation

| Severity | File | Issue | Fix Suggestion |
|----------|------|-------|----------------|
| **HIGH** | `server/routes/tasks.js:38-39` | `priority` and `dueDate` accepted without type/range validation. `priority` could be any number; `dueDate` could be an invalid date string. | Validate priority is 1-4, validate dueDate is a parseable date (e.g., `!isNaN(Date.parse(dueDate))`). |
| **HIGH** | `server/routes/tasks.js:31` | `projectId` is accepted but never validated against existing projects in `projects.js`. Users can create tasks referencing nonexistent or other users' projects. | Reject if `projectId` is provided but the project does not exist or does not belong to `req.user.id`. |
| **HIGH** | `server/routes/labels.js:29` | `color` defaults to `#6B7280` but is never validated as a valid hex color. | Validate with `/^#[0-9A-Fa-f]{6}$/`. |
| **MEDIUM** | `server/routes/pomodoro.js:29` | `mode` defaults to `'focus'` but any arbitrary string is accepted. | Validate against an allowlist: `['focus', 'break', 'long_break']`. |
| **MEDIUM** | `server/routes/tasks.js:39` | `labels` is expected to be an array but can be any JSON type — if a string or object is passed, downstream code may break. | Check `Array.isArray(req.body.labels)` before accepting. |
| **MEDIUM** | `server/routes/comments.js:19` | `content` is only checked for truthiness — empty strings with whitespace pass validation. | Trim and check `.trim().length === 0`. |
| **MEDIUM** | `server/routes/tasks.js:24` | `title` is only checked for truthiness — a title of just whitespace passes. | Trim and check `.trim().length === 0`. |
| **MEDIUM** | `server/routes/projects.js:21` | `name` is only checked for truthiness — whitespace-only passes. | Trim and check `.trim().length === 0`. |

## 3) Error Handling Problems

| Severity | File | Issue | Fix Suggestion |
|----------|------|-------|----------------|
| **HIGH** | All route files | No global error-handling middleware in `server/index.js`. If any synchronous route throws, Express returns a bare `500` with no JSON body (or crashes the process). | Add an Express error-handling middleware at the end of `server/index.js`: `app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Internal server error' }) })`. |
| **MEDIUM** | `server/routes/auth.js:57,106` | `console.error()` used for logging — no structured logging, no log levels, cannot be routed to a production log aggregator. | Replace with a logger (e.g., `pino`, `winston`). |
| **MEDIUM** | `server/routes/auth.js:58,107` | Generic `"注册失败"` / `"登录失败"` error messages. While this avoids leaking details, it makes debugging production issues harder. | Log the real error server-side and return a correlation ID to the client. |
| **LOW** | `server/routes/admin.js:7,21` | Mock data returned with TODO comments instead of proper error handling or 501 Not Implemented. | Either implement the endpoint or return `501` with a clear message. |
| **LOW** | `server/routes/comments.js:41`, `server/routes/projects.js:43`, `server/routes/tasks.js:55` | Ownership check returns 404 ("does not exist") instead of 403 ("forbidden") when the resource exists but belongs to another user. This leaks the existence of resources to attackers. | Return `403` when the resource exists but does not belong to the user. |

## 4) Data Isolation Bugs

| Severity | File | Issue | Fix Suggestion |
|----------|------|-------|----------------|
| **CRITICAL** | `server/routes/comments.js:8-16` | No `userId` filter in `GET /tasks/:taskId/comments` — any authenticated user can read ALL comments for any `taskId` by guessing/iterating IDs. | Add `comment.userId === req.user.id` filter (same pattern as all other GET routes). |
| **HIGH** | `server/routes/comments.js:18-36` | `POST /tasks/:taskId/comments` does not verify task ownership — user A can attach comments to user B's task. | Look up the task from the tasks store and verify `task.userId === req.user.id` before creating the comment. |
| **HIGH** | `server/routes/tasks.js:31` | `projectId` and `sectionId` are stored but never validated against the user's projects — a user can link a task to another user's project. | Validate `projectId` (and `sectionId`) exist and belong to `req.user.id` before creating/updating. |
| **MEDIUM** | `server/routes/pomodoro.js:23` | `taskId` in pomodoro sessions is accepted but never validated against the user's tasks. | Validate `taskId` belongs to `req.user.id` before creating the session. |

---

## Summary

- **CRITICAL**: Hardcoded JWT secret, no admin role check, comments data leak (no userId filter), and mass-assignment vulnerabilities are the most urgent issues.
- **Pervasive pattern**: The `...req.body` spread pattern in PUT routes (tasks, projects, labels) allows clients to overwrite protected fields like `createdAt`. Use field whitelisting instead.
- **Comments route is broken**: It's the only route that omits the `userId` filter on reads, making it a data leak for all comments.
- **No global error handler**: Express apps without `app.use((err, req, res, next) => {...})` can crash on uncaught synchronous errors.
- **Missing input validation**: Nearly every endpoint trusts user input without type, format, or length checks.
