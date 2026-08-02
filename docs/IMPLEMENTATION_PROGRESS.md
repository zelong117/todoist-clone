# TaskFlow Implementation Progress

Updated: 2026-08-02
Branch observed: `master`

## Product Direction

TaskFlow is an original task-management SaaS for personal planning and team delivery. The shared visual language is the warm paper workflow system established by the login and registration pages: cream surfaces, ink typography, coral action color, restrained borders, editorial spacing, and an explicit Capture -> Plan -> Focus -> Review loop.

## Completed In This Worktree

- Added a real marketing home at `/` with navigation, workflow explanation, team scenario, plan selector, FAQ, and login/register CTAs.
- Added the generated workflow illustration at `public/images/taskflow-workflow.png` and connected it to the auth experience.
- Added responsive login/register forms with validation, loading, error, password visibility, and direct `/login` / `/register` URLs.
- Added PWA manifest, branded SVG icons, service worker shell caching, offline fallback, and explicit exclusion of API/auth data from caches.
- Added `start-taskflow.bat` for relative-path Windows startup, health checks, and browser opening.
- Moved authentication to the mount layer for tasks, labels, sections, filters, notifications, insights, comments, pomodoro, admin, shares, users, attachments, teams, and audit logs.
- Added attachment MIME/extension allowlisting alongside the existing 10MB limit.
- Added OAuth state/PKCE for Google, state validation for WeChat, one-time short-lived OAuth exchange codes, and removed JWTs from redirect query parameters.
- Removed client-supplied AI credentials, endpoint, model, and entitlement identity from AI execution. AI uses the authenticated user and a server-only allowlist.
- Reworked administrator configuration so it never writes `.env` at runtime, paginates user results, and rejects non-allowlisted AI endpoints.
- Centralized Free, Pro, and Business limits in `server/services/plans.js`; quota checks now resolve the current database plan rather than a JWT claim.
- Added subscription and payment-order schemas, an admin-only plan assignment endpoint, a public plan catalog, a protected subscription endpoint, and an audit-log entry for every manual assignment.
- Added a plan selector to the administrator user table. It calls the protected server endpoint and does not expose a public checkout or self-upgrade API.
- Moved recurring-task successor generation into a server transaction. Completing a valid recurring task now persists the next task before responding, so refreshes and other devices observe the same state.
- Added a user-scoped IndexedDB task mutation queue for offline create, update, complete, and delete. It retries sequentially after connectivity returns and refreshes from the server on success.
- Added platform projects: a Tauri v2 desktop wrapper with a restricted CSP and minimum capability, generated Capacitor Android/iOS source projects synchronized from the production Web build, and a WeChat Mini Program with authenticated task, project, and account flows using the same REST boundary.
- Added a touch-oriented mobile workbench bottom navigation for Inbox, Today, quick task creation, notifications, and settings. The desktop sidebar now renders the authenticated user's real name and email rather than placeholder identity data.
- Hardened team roles with a server-side allowlist, Business-plan gating for team administration, protected role edits, and an explicit ownership-transfer transaction.
- Replaced hard-coded sidebar identity with the authenticated user and added a routed notification center backed by the notifications API.
- Added a routed subscription and usage center. It loads the authenticated server-side entitlement and public plan catalog, shows actual plan limits, and deliberately leaves checkout unavailable until a real provider is configured.
- Added a server-backed administrator console at `/admin` with operational overview, plan/order/team visibility, AI allowlist/runtime status, and audited user freeze/unfreeze controls. Frozen accounts are rejected by the authentication middleware on every request.
- Added a routed Business team workspace at `/app/teams` for team creation, member listing, registered-user invitations, role changes, member removal, ownership transfer, and self-removal. The UI consumes the existing server-enforced role and plan boundary.
- Added an account center at `/app/account` with server-side JSON export and a password-plus-exact-email account deletion flow. Team owners must transfer or remove their team before deletion; exports omit password hashes, tokens, and payment secrets.
- Removed the legacy AI-route plan assignment endpoint. Plan mutations now remain limited to the billing administrator endpoint and verified payment webhooks.
- Replaced unauthenticated attachment static-file serving with an authenticated, owner-scoped download endpoint. Attachment bytes now require both a valid session and a matching `attachments.user_id` record.
- Added an inspectable offline sync queue at `/app/offline`: it shows owner-scoped pending mutations, retry count and last failure, supports manual retry, and requires confirmation before discarding a pending change.
- Corrected the actual local `server/.env` CORS whitelist to include `http://127.0.0.1:5173`, resolving the browser preflight failure that blocked local registration while the API itself was healthy.
- Extended signed payment event processing with `past_due` and explicit grace-period state, payment failure reasons/attempts, and cancellation state retained through the period end. The user subscription page now renders server-provided payment history and payment-state notices; no public checkout has been enabled.
- Removed all browser-side AI credential persistence and the obsolete client AI configuration panel; the browser no longer reads, writes, or submits AI keys or arbitrary endpoints.
- Preserved earlier quota ordering, admin-only plan mutation, AI HTML escaping, fixed AI endpoint policy, Docker secret exclusion, Nginx startup fix, and consistent frontend/admin token storage.
- Coalesced ordinary `sql.js` writes for a bounded 150ms window, kept transaction commits synchronous, and added shutdown flushing so persistence does not export the complete database after every independent mutation.
- Added optimistic task-version protection for multi-device edits. Store-driven update, delete, and completion requests carry the last server `updatedAt`; a stale request receives a `409 TASK_VERSION_CONFLICT` with the current task snapshot. Offline replay preserves that version, marks conflicts for review, and never silently retries over newer server data.
- Made local account registration and first-time OAuth account creation transactional. These identity records now synchronously persist before their successful response, while high-frequency task writes retain bounded batching.
- Added attachment file-signature verification before database registration: JPEG, PNG, WebP, and PDF uploads must match their magic bytes, while text uploads reject binary NUL content. Failed validation removes the staged file.
- Compressed the generated workflow visual from 2.7MB PNG to a 118KB WebP and added a PNG fallback through a semantic `picture` element.
- Expanded the public marketing route into a complete SaaS narrative: hero, product UI workflow, calendar planning, AI/analytics, personal and team usage, plan comparison, security/privacy, scenario illustration, FAQ, final conversion CTA, and responsive footer.
- Added public `/privacy` and `/terms` pages plus a dismissible essential-cookie notice. The legal copy is scoped to the behavior currently implemented and does not claim a payment provider, cloud deployment, or nonexistent certification.
- Replaced task-detail reminder and location placeholders with authenticated, version-checked persisted task metadata. Existing local databases receive the nullable `reminder_at` and `location` columns through idempotent startup migrations; due reminders enter the existing notification center during server notification refreshes.
- Extended server-side recurring-task creation so a next instance retains its location and advances a valid reminder by the same calendar-day offset as its next due date. It never copies an unresolvable or expired timestamp blindly.
- Hardened AI task extraction so every image-to-model path accepts only bounded PNG/JPEG/WebP data URLs, rejecting arbitrary external URLs before an upstream request. Successful AI POST operations now produce minimal `ai_usage` audit records that enforce the server-side daily quota without retaining prompts, task snapshots, or image data.
- Refined AI metering so a hosted-image capability denial is explanatory only: it does not create an `ai_usage` record or consume a user's daily quota. Successful local/hosted analysis remains server-metered.
- Routed Quick Capture task extraction through the shared authenticated API client instead of a hard-coded port and ad-hoc token read. Its user-confirmed task creation now maps AI priority words into the server's validated `1..4` priority contract.
- Reworked project sharing to use the shared authenticated API client for member loading, invitation, role updates, and removal. The server now rejects non-whitelisted invite roles, so a browser cannot grant a project-level `owner` or arbitrary role through a crafted request.
- Made derived notifications fully reconcilable. Each refresh recomputes reminder, overdue, today, high-priority, and inbox-triage notices, removing only stale records of those system types when a task changes while preserving unrelated notifications.
- Added an accessible global command palette for authenticated workspaces. `Ctrl/Cmd+K` focuses command and task search; arrow keys navigate, `Enter` executes, and the built-in commands open Quick Add, Inbox, Today, notifications, or settings without duplicating routing state.
- Added server-authoritative device sessions. Each password or OAuth sign-in receives a distinct revocable session ID inside its signed JWT; middleware verifies that session server-side on every protected request. The account center lists privacy-safe device labels, supports single-device remote sign-out and sign-out-other-devices, and password reset revokes every active session.
- Rebuilt real-time authentication so access tokens never travel in WebSocket query strings. A connection must send an authenticated first frame before it receives events, and the server validates the same revocable session state used by HTTP. Task and comment events now target only the owning user's connected devices, while remote session revocation closes the matching live connection.
- Extended the native WeChat Mini Program with server-side `wx.login` code exchange, AI quick task extraction with explicit selected-task confirmation, notification viewing, and server-owned plan/usage display. The AppSecret remains an environment-only server credential; the Mini Program only sends the short-lived WeChat code.

## Evidence Already Collected

- Root `npm ci --no-audit --no-fund`: passed.
- Server `npm ci --no-audit --no-fund`: passed.
- `npm run build`: passed after the UI changes.
- Backend JavaScript syntax checks: passed after the OAuth rewrite.
- `server npm run test:plans`: passed for Free defaults, Pro entitlement assignment, subscription persistence, and invalid-plan rejection.
- `server npm run test:recurrence-api`: passed against an isolated temporary server/database for recurring task persistence and recurrence validation.
- Platform JSON configuration parsing: passed for Tauri and WeChat configuration files.
- `GET /api/health`: HTTP 200.
- `GET /api/docs`: HTTP 200.
- Frontend root request: HTTP 200 when the development server was active; production `dist` was also rendered directly in Chrome.
- Desktop login, admin redirect, and mobile registration were rendered with installed Google Chrome; mobile document width matched the viewport.
- Marketing home and privacy route were rendered in Chrome at desktop and mobile widths with no console errors. Full-page captures: `marketing-expanded-desktop.png` and `marketing-expanded-mobile.png`.

## Local Endpoints After Startup

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:3001`
- Workspace: `http://127.0.0.1:5173/app/inbox`
- Admin: `http://127.0.0.1:5173/admin` (server-enforced admin role)
- API docs: `http://127.0.0.1:3001/api/docs`

No long-running process is claimed by this document. Use `start-taskflow.bat` to start the frontend and backend, then use the addresses above.

## Resume Rule

Read this file, `git status`, and `docs/TEST_RESULTS.md` before starting the next stage. Do not claim a platform is built, signed, published, or listed unless the corresponding command and artifact exist.
