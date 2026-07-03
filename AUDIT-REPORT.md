# Route Audit Report

Reviewed directory: `server/routes`

## Findings

| File | Line | Severity | Category | Issue |
| --- | ---: | --- | --- | --- |
| `server/routes/admin.js` | 5 | high | data isolation | `GET /stats` is protected only by `authenticate` and has no admin/role check, so any authenticated user can access admin-only aggregate data. |
| `server/routes/admin.js` | 18 | high | data isolation | `GET /users` is also missing admin authorization. If this route is later wired to real user data, any logged-in user could enumerate other users. |
| `server/routes/auth.js` | 9 | high | storage | User accounts are stored in an in-memory `Map`, so data is lost on restart and cannot support real multi-process or production deployments. |
| `server/routes/auth.js` | 14 | medium | input validation | Registration only checks presence of `email`, `name`, and `password`. It does not validate email format, string types, length limits, or password strength. |
| `server/routes/auth.js` | 21 | medium | input validation | Email uniqueness is checked with raw string comparison and no normalization, so duplicate accounts such as case variants can be created. |
| `server/routes/auth.js` | 65 | medium | input validation | Login accepts unchecked `email` and `password` values with no type/format validation before use. |
| `server/routes/auth.js` | 112 | low | error handling | `GET /me` has no local error handling. If the backing store is replaced or the lookup layer throws, the route will fall through to an unstructured 500. |
| `server/routes/comments.js` | 6 | high | storage | Comments are stored in an in-memory `Map`, so they are not durable and cannot be shared safely across server instances. |
| `server/routes/comments.js` | 8 | high | data isolation | `GET /tasks/:taskId/comments` filters only by `taskId` and does not verify that the task belongs to `req.user.id`. Any user who knows another user's `taskId` can read that task's comments. |
| `server/routes/comments.js` | 18 | high | data isolation | `POST /tasks/:taskId/comments` does not verify that `taskId` exists or belongs to the current user, so a user can attach comments to another user's task. |
| `server/routes/comments.js` | 19 | medium | input validation | Comment creation only checks that `content` is truthy. It does not validate type, trim empty whitespace, or enforce length limits, and `taskId` is not validated. |
| `server/routes/comments.js` | 8 | low | error handling | The comments routes have no `try/catch` or delegated async error handling, so storage or parsing failures will surface as generic 500 responses without route-specific handling. |
| `server/routes/labels.js` | 6 | high | storage | Labels are stored in an in-memory `Map`, which is not suitable for persistent or multi-instance production use. |
| `server/routes/labels.js` | 18 | medium | input validation | Label creation validates only `name` presence. It does not validate `name` type/length or ensure `color` is a valid allowed value. |
| `server/routes/labels.js` | 44 | medium | input validation | `PUT /:id` blindly merges `req.body` into the label object. This allows unexpected fields and invalid values because there is no update schema validation. |
| `server/routes/labels.js` | 8 | low | error handling | The label routes do not wrap storage operations with route-level error handling, so unexpected failures return generic server errors. |
| `server/routes/pomodoro.js` | 6 | high | storage | Pomodoro sessions are stored in an in-memory `Map`, so session history is lost on restart and is unsafe for production scaling. |
| `server/routes/pomodoro.js` | 18 | medium | data isolation | `POST /start` accepts any `taskId` without confirming that the referenced task belongs to the current user, allowing cross-user task references in session records. |
| `server/routes/pomodoro.js` | 19 | medium | input validation | `taskId` and `mode` are not validated. The route accepts arbitrary values instead of enforcing known task identifiers and allowed modes. |
| `server/routes/pomodoro.js` | 38 | medium | input validation | `POST /stop` does not validate `sessionId` or `completed`, so malformed or wrong-typed values are accepted. |
| `server/routes/pomodoro.js` | 8 | low | error handling | The pomodoro routes have no route-level error handling for storage or date-calculation failures. |
| `server/routes/projects.js` | 6 | high | storage | Projects are stored in an in-memory `Map`, which should be replaced with real database persistence. |
| `server/routes/projects.js` | 18 | medium | input validation | Project creation only checks `name` presence. It does not validate `name` length/type, `color` format, or that `usePomodoro` is a boolean. |
| `server/routes/projects.js` | 47 | medium | input validation | `PUT /:id` mass-assigns `req.body` into the stored project with no field allowlist or schema validation, permitting invalid or unexpected data. |
| `server/routes/projects.js` | 8 | low | error handling | The project routes do not handle storage exceptions explicitly, so runtime failures become generic 500s. |
| `server/routes/tasks.js` | 7 | high | storage | Tasks are stored in an in-memory `Map`, which is not durable and should be replaced with a real database. |
| `server/routes/tasks.js` | 20 | high | data isolation | Task creation accepts arbitrary `projectId`, `sectionId`, `parentId`, and `labels` without verifying that those related records belong to the current user. This allows cross-user references and broken tenant boundaries. |
| `server/routes/tasks.js` | 21 | medium | input validation | Task creation validates only `title` presence. It does not validate title type/length or the types/ranges of `priority`, `dueDate`, `labels`, and `plannedPomodoros`. |
| `server/routes/tasks.js` | 58 | high | data isolation | `PUT /:id` blindly merges `req.body`, so a user can reassign an existing task to foreign `projectId`, `parentId`, or label references without ownership checks. |
| `server/routes/tasks.js` | 58 | medium | input validation | Task updates have no allowlist or schema validation, so invalid fields and wrong-typed values are persisted. |
| `server/routes/tasks.js` | 9 | low | error handling | The task routes do not wrap storage operations with route-level error handling, so unexpected failures return generic 500 responses. |

## Notes

- Line numbers point to the relevant handler or statement that introduces the issue.
- The most serious problems are the missing authorization checks on admin routes and the cross-user reference/read issues in `comments.js` and `tasks.js`.
