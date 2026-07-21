# TodoList Workflow Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make TodoList server-backed and user-isolated, then add stable routes and the approved Todoist-inspired task workflow without making pomodoro or AI permanent navigation clutter.

**Architecture:** Express and SQLite remain the authoritative business-data layer; Zustand becomes a client cache plus UI-state store. A small native History API router maps URLs to existing views, while focused React components own quick add, view settings, and task details. Security fixes precede UI work so every new interaction uses an authenticated, isolated API.

**Tech Stack:** React 19, TypeScript, Zustand, Vite, Express 4, sql.js/SQLite, JWT, ws, Node test runner script, Playwright browser verification.

---

### Task 1: Private Data Isolation Baseline

**Files:**
- Modify: `server/index.js`
- Modify: `server/routes/tasks.js`
- Modify: `server/websocket/notificationService.js`
- Modify: `server/routes/ai.js`
- Modify: `server/routes/attachments.js`
- Modify: `src/api.ts`
- Modify: `src/pages/Admin.tsx`
- Modify: `src/components/SharePanel.tsx`
- Modify: `src/components/QuickCapture.tsx`
- Test: `server/test/api.test.js`

- [ ] **Step 1: Add failing two-user security regressions**

Extend the existing API harness with users A and B. Create one task and attachment as A, then assert B receives `404` or `403` for the task/file; perform two consecutive `GET /api/tasks` calls as each user and assert neither response contains the other user's task. Assert unauthenticated AI calls return `401` and `POST /api/ai/upgrade` returns `404`.

- [ ] **Step 2: Verify the regressions fail before implementation**

Run: `npm --prefix server test`

Expected: the new cache, attachment, AI, or upgrade assertions fail while the existing 16 checks continue to execute.

- [ ] **Step 3: Put authentication before private reads and target task events**

Mount `authenticate` before any project/task/label cache middleware in `server/index.js`, and generate cache keys only from `req.user.id`. Replace each task `notificationService.broadcast(...)` call with targeted delivery to the owner plus authorized project members returned by the database; keep channel subscriptions for client preferences, but do not use subscriptions as an authorization boundary. Centralize token reads in `src/api.ts` using `todoist_token`, and remove direct `token` reads from Admin, SharePanel, and QuickCapture.

- [ ] **Step 4: Close AI and attachment authorization gaps**

Apply `authenticate` to every AI route, derive identity and plan only from `req.user` plus the database, delete the demo `/upgrade` handler, and reject client-controlled provider URLs. Remove the public attachment static mount; add `GET /api/tasks/:taskId/attachments/:id/file` that checks task ownership before `res.sendFile`. Configure Multer with a bounded size and an allowlist for PDF, plain text, PNG, JPEG, and WebP.

- [ ] **Step 5: Run the security suite and commit**

Run: `npm --prefix server test`

Expected: all old and new API checks pass with no cross-user record or file exposure.

Commit: `fix: isolate private backend data`

### Task 2: Persistent Sections and Server Bootstrap

**Files:**
- Modify: `server/db.js`
- Create: `server/routes/sections.js`
- Create: `server/routes/bootstrap.js`
- Modify: `server/routes/tasks.js`
- Modify: `server/index.js`
- Modify: `src/api.ts`
- Modify: `src/store.ts`
- Modify: `src/App.tsx`
- Test: `server/test/api.test.js`

- [ ] **Step 1: Add failing section and bootstrap API tests**

Test authenticated section create/list/update/delete, reject a section from another project/user, reject assigning a task to a section outside its project, and assert `GET /api/bootstrap` returns `{ projects, sections, labels, tasks }` containing only the current user's records.

- [ ] **Step 2: Add the schema and routes**

Create an idempotent `sections` table with `id`, `user_id`, `project_id`, `name`, `sort_order`, `created_at`, and `updated_at`, plus user/project indexes. Implement authenticated CRUD with ownership checks and map `sort_order` to `order`. Mount `/api/sections` and `/api/bootstrap` in `server/index.js`.

- [ ] **Step 3: Validate task section membership**

Replace the current unconditional `sectionId` rejection in task create/update with a query requiring matching `sections.id`, `sections.project_id`, and `sections.user_id`. Null remains valid and deleting a section clears its tasks' `section_id`.

- [ ] **Step 4: Make bootstrap authoritative on login**

Add `bootstrapAPI.get()` in `src/api.ts`. Add `bootstrap(): Promise<void>` plus `isBootstrapping` and `bootstrapError` to `src/store.ts`; atomically replace projects, sections, labels, and tasks from the server payload. Remove local-only mutation fallbacks for projects, sections, and labels so failed writes reject and leave state unchanged. Call `bootstrap()` from `src/App.tsx` after authentication instead of `fetchSections()`.

- [ ] **Step 5: Verify and commit**

Run: `npm --prefix server test`

Expected: section ownership, task membership, and bootstrap tests pass.

Run: `npm run build`

Expected: TypeScript and Vite production build succeed.

Commit: `feat: add server backed sections and bootstrap`

### Task 3: Lossless Existing-Data Migration

**Files:**
- Create: `server/routes/import.js`
- Modify: `server/db.js`
- Modify: `server/index.js`
- Modify: `src/api.ts`
- Create: `src/components/DataMigration.tsx`
- Modify: `src/App.tsx`
- Test: `server/test/api.test.js`

- [ ] **Step 1: Add failing idempotent-import tests**

Post the same payload containing one project, section, label, and task twice to `POST /api/import`. Assert both requests succeed, dependency links are preserved, and bootstrap contains one copy of each record. Post a section referencing a missing project and assert the entire request fails without partial rows.

- [ ] **Step 2: Add stable import keys and a transaction**

Add nullable `import_key` columns with per-user unique indexes to projects, sections, labels, and tasks. Implement one authenticated transaction that validates the full payload, upserts in project/section/label/task dependency order, maps old IDs to server IDs, and rolls back on any invalid reference.

- [ ] **Step 3: Add export-first migration UI**

When legacy `todoist-tasks`, `todoist-projects`, `todoist-sections`, or `todoist-labels` contain records and `todoist-server-migration-v1` is absent, show counts and a “Download backup” action that creates a JSON Blob from the untouched local records. Enable import only after backup download; after import, reload bootstrap and set the migration marker only when returned counts and import keys match. Keep the original local keys unchanged on success or failure.

- [ ] **Step 4: Verify and commit**

Run: `npm --prefix server test && npm run build`

Expected: duplicate import is idempotent, invalid import is atomic, and the frontend production build succeeds.

Commit: `feat: migrate local data to server safely`

### Task 4: Stable Native Application Routes

**Files:**
- Create: `src/lib/router.ts`
- Modify: `src/App.tsx`
- Modify: `src/store.ts`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/ProjectView.tsx`
- Modify: `src/components/TaskDetail.tsx`

- [ ] **Step 1: Define and unit-check route parsing**

Implement pure `parseRoute(pathname)` and `pathForRoute(route)` functions for `/app/inbox`, `/app/today`, `/app/upcoming`, `/app/project/:projectId`, `/app/project/:projectId/section/:sectionId`, `/app/project/:projectId/task/:taskId`, and `/admin`. Unknown paths resolve to inbox; route segments use `encodeURIComponent`/`decodeURIComponent`.

- [ ] **Step 2: Synchronize URL and selected state**

On first render and `popstate`, parse `window.location.pathname` and set the active view, project, section, and task after bootstrap. Navigation actions call `history.pushState`; task close calls `history.back()` when opened from the same app session and otherwise replaces the project URL. Do not persist selected records in local storage.

- [ ] **Step 3: Wire all navigation entry points**

Replace sidebar/project/task selection-only handlers with route navigation. Ensure opening a task emits its deep link and `/admin` is rendered only after the existing admin-role check.

- [ ] **Step 4: Verify route behavior and commit**

Run: `npm run build`

Expected: production build succeeds.

Browser checks: directly open every route, refresh, use Back/Forward, and open a task link in a fresh tab; each URL restores the same authorized view or a clear not-found/forbidden state.

Commit: `feat: add stable application routes`

### Task 5: Section-Level Quick Add

**Files:**
- Create: `src/components/SectionQuickAdd.tsx`
- Modify: `src/components/ProjectView.tsx`
- Modify: `src/components/BoardView.tsx`
- Modify: `src/store.ts`

- [ ] **Step 1: Build one context-aware form**

Create `SectionQuickAdd` with `projectId`, nullable `sectionId`, and `onClose`. Render title, optional description/date/priority/labels, submit, and cancel. Initialize project/section from props; disable submit for `title.trim().length === 0` and while saving; focus title on open; Escape cancels.

- [ ] **Step 2: Make task creation return authoritative data**

Change `addTask` to return `Promise<Task>`, use the API response as the inserted record, surface API errors inline, and never add a local fallback task.

- [ ] **Step 3: Mount quick add in list and board sections**

Keep one open composer at a time using nullable `addingSectionId`. Insert the successful task into the current section without changing project, route, scroll, or board column.

- [ ] **Step 4: Verify and commit**

Run: `npm run build && npm run lint`

Expected: build passes; lint has no new errors. Keyboard and mouse checks confirm empty submit is disabled and the created task remains in the selected section after refresh.

Commit: `feat: add section quick task creation`

### Task 6: Unified View Menu and Minimal Board Cards

**Files:**
- Create: `src/components/ViewOptionsMenu.tsx`
- Modify: `src/types.ts`
- Modify: `src/store.ts`
- Modify: `src/components/ProjectView.tsx`
- Modify: `src/components/BoardView.tsx`
- Modify: `src/components/TaskItem.tsx`

- [ ] **Step 1: Define one view-options model**

Add layout, grouping, sort field/direction, due-date/priority/label filters, and completed visibility to UI state. Add one reset action that restores list layout, section grouping, manual order, ascending direction, no filters, and hidden completed tasks.

- [ ] **Step 2: Build the consolidated menu**

Use one project-header menu with segmented layout controls and native select/checkbox controls for grouping, sorting, direction, filters, completed visibility, and reset. Apply options through derived selectors without mutating server records.

- [ ] **Step 3: Reduce board-card density**

Default cards show checkbox, title, due-state, and no more than two metadata signals. Move description, full labels, timestamps, pomodoro progress, and secondary actions to task details or a focus/hover action row. Ensure `:focus-within` exposes the same controls as hover.

- [ ] **Step 4: Verify and commit**

Run: `npm run build && npm run lint`

Expected: build passes, all menu combinations update the current project without layout shift, and keyboard focus exposes card actions.

Commit: `feat: unify project view controls`

### Task 7: Layered Task Details and Contextual Tools

**Files:**
- Modify: `src/components/TaskDetail.tsx`
- Modify: `src/components/PomodoroBar.tsx`
- Modify: `src/components/AIAssistant.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Reorder the detail surface**

Render a context header with project/section breadcrumb, previous/next, close, and overflow. Put completion, title, description, subtasks, comments, and attachments in the primary column; put project/section, date/deadline, priority, labels, and reminder in the properties column. On narrow screens stack properties below content with no horizontal overflow.

- [ ] **Step 2: Make pomodoro and AI demand-driven**

Expose “Start focus” and “AI assist” from the task action menu. Show the compact pomodoro bar only while a session is active; keep the assistant collapsed until invoked from quick capture or a task. Preserve existing timer/session data and AI capabilities.

- [ ] **Step 3: Preserve detail navigation context**

Previous/next uses the current filtered task order and updates the task URL. Closing restores the project URL and the existing scroll/board position.

- [ ] **Step 4: Verify and commit**

Run: `npm run build && npm run lint`

Expected: build passes; detail hierarchy works at desktop and mobile widths; idle pomodoro/AI do not occupy permanent page space.

Commit: `feat: reorganize task details and tools`

### Task 8: Sidebar Reduction and End-to-End Verification

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/index.css`
- Test: `server/test/api.test.js`

- [ ] **Step 1: Keep the sidebar focused**

Retain search, inbox, today, upcoming, filters, activity, and projects. Remove permanent pomodoro/AI destinations; keep admin visible only to admins. Preserve collapse behavior and mobile dismissal.

- [ ] **Step 2: Run all automated checks**

Run: `npm --prefix server test`

Expected: all API and security checks pass.

Run: `npm run build`

Expected: TypeScript and Vite production build succeed.

Run: `npm run lint`

Expected: no errors and no new warnings in changed files.

- [ ] **Step 3: Run browser acceptance checks**

Start backend on `http://localhost:3001` and frontend on `http://localhost:5173`. With Playwright, capture desktop `1440x900` and mobile `390x844` screenshots for list, board, section quick add, unified menu, and task detail. Verify no overlap or horizontal scroll, task-card hover/focus parity, direct-route refresh, Back/Forward, empty-submit prevention, and persisted server data after reload.

- [ ] **Step 4: Commit the final polish**

Commit: `chore: finish workflow upgrade verification`

Expected: the working tree contains only pre-existing unrelated changes plus intentional upgrade files.
