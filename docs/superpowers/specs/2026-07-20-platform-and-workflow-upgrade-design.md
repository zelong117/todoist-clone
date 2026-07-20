# TodoList Platform and Workflow Upgrade

Date: 2026-07-20
Status: Approved direction, implementation pending

## Objective

Turn the current single-browser MVP into a secure, server-backed product foundation, then simplify its primary task workflows using mature Todoist interaction patterns while preserving pomodoro and AI as optional differentiators.

## Delivery Phases

### Phase 1: Platform foundation

1. Make the backend the authoritative source for tasks, projects, sections, labels, comments, settings, and pomodoro sessions.
2. Preserve existing browser data through an export-first, idempotent migration flow.
3. Fix cross-user cache and WebSocket isolation.
4. Require authentication and server-side entitlement checks for AI features.
5. Remove self-service plan upgrades until verified payment callbacks exist.
6. Protect attachment downloads and restrict upload types.
7. Add complete section persistence and ownership validation.
8. Add stable project, task, and admin routes.

### Phase 2: Core workflow

1. Rebuild section-level quick add.
2. Reduce board card information density.
3. Consolidate layout, grouping, sorting, and filters.
4. Reorganize task details into a clear hierarchy.
5. Move pomodoro and AI into contextual, on-demand surfaces.

## Architecture

### Backend ownership

The server becomes the only source of truth for business data. Zustand remains the client cache and UI state manager. Local storage keeps only UI preferences, draft state, and a one-time migration marker.

On authentication, the client loads a bootstrap payload containing the user's projects, sections, labels, and tasks. Writes update the server first and then update local state from the server response. Failed writes remain visible as errors and must not silently create local-only records.

### Existing data migration

Before migration, the client downloads a JSON backup of the current Zustand data. A bulk import endpoint accepts projects, sections, labels, and tasks in dependency order and uses stable import keys so retrying cannot create duplicates.

The migration UI shows counts before import and marks completion only after a server reload returns the imported records. Existing browser data is not deleted automatically.

### Security boundaries

- Authenticate before any private response cache lookup. Private list caching stays disabled until its user isolation and invalidation tests pass.
- WebSocket events target the owning user and authorized project members only.
- AI routes require authentication. User identity and plan come exclusively from the verified token and database.
- The demo upgrade endpoint is removed. Only a future verified payment webhook may grant a paid plan.
- Attachment files are served through an authenticated ownership-checked route, not a public static directory.
- Admin UI and APIs require an administrator role.

### Sections

Add a sections table with project ownership, sort order, timestamps, indexes, and deletion behavior. Implement authenticated section CRUD routes. Tasks may reference only sections belonging to their selected project and accessible to the current user.

### Client routes

Use stable application routes:

- `/app/inbox`
- `/app/today`
- `/app/upcoming`
- `/app/project/:projectId`
- `/app/project/:projectId/task/:taskId`
- `/admin`

Navigation updates browser history, supports refresh and back/forward navigation, and restores the selected project and task. Server and Vite fallbacks continue serving the SPA for these paths.

## Workflow Design

### Section quick add

The add control expands inside the selected section. Project and section are preselected. The initial form contains title, description, date, priority, labels, and submit/cancel actions. Submit is disabled until a non-empty title exists. Successful creation inserts the server response into the correct section without closing the user's context.

### Board cards

Cards show completion, title, due-state warning, and at most two compact metadata signals. Pomodoro progress, full labels, descriptions, timestamps, and secondary controls appear on hover, focus, or in task details. Keyboard focus exposes the same actions as hover.

### View menu

One view menu owns:

- list, board, and calendar layout
- grouping
- sorting and direction
- date, priority, and label filters
- completed-task visibility
- reset

The project header keeps only project identity, share, view menu, comments, and overflow actions.

### Task details

The detail surface uses:

1. Context header: project, section, previous/next, close, overflow.
2. Primary content: completion, title, description, subtasks, comments, attachments.
3. Properties: project/section, date, deadline, priority, labels, reminder.
4. Optional tools: pomodoro and AI actions.

Opening a task updates the URL. Closing it returns to the project route without losing scroll or board position.

### Pomodoro and AI

Pomodoro remains available from a task action and a compact active-session bar. It does not occupy a permanent full-width band when idle.

AI remains available from quick capture, task actions, and a collapsible assistant. It does not compete with core navigation or task controls. Paid AI use is metered and authorized server-side.

## Error Handling

- Loading, empty, offline, unauthorized, forbidden, and retry states are explicit.
- Mutations do not report success until the server confirms them.
- Failed migrations preserve the original browser data and provide a retry report.
- Route-level errors distinguish missing records from insufficient access.

## Verification

### Backend

- Cache isolation test with two users and a forced cache hit.
- WebSocket isolation test with two authenticated users.
- Section CRUD and project ownership tests.
- Bootstrap and idempotent migration tests.
- AI authentication and entitlement tests.
- Attachment upload and download authorization tests.
- Shared project read/write role tests.

### Frontend

- Production build and lint.
- Browser checks for direct routes, refresh, back/forward, and task deep links.
- Desktop and mobile screenshots for list, board, quick add, task details, and the unified view menu.
- Keyboard and focus checks for card actions and dialogs.
- Migration rehearsal against a copied browser-data export.

## Non-goals

- Payment provider implementation is not part of this upgrade; insecure demo upgrades are removed and a payment-ready boundary is created.
- PostgreSQL migration, mini-program UI, and native App UI follow after the server-backed web workflow is stable.
- No microservices are introduced.

## Completion Criteria

The upgrade is complete when two users cannot observe each other's private data through HTTP, cache, WebSocket, files, or UI state; existing local data can be migrated without loss; every core entity reloads from the server; stable routes survive refresh; and the revised task workflows pass desktop and mobile browser verification.
