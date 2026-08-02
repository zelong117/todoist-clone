# Test Results

Updated: 2026-08-02

## Passed

- Root `npm run build`: TypeScript and Vite production build passed without warnings after removal of the malformed mobile CSS selector.
- Root `npm run lint`: completed with existing warnings only and no errors; no warnings originate from the new administrator, team, or account center code.
- Active local API health endpoint: HTTP 200.
- Active local `GET /api/billing/plans`: returned Free, Pro, and Business with server-owned price, currency, project, and AI limits.
- Subscription and usage center: TypeScript production build passed with the authenticated subscription API contract and public plan catalog client.
- `server node test/security.test.js`: `113/113` passed against the active local API. Coverage includes SQL injection, JWT tampering, auth bypass, rate limits, validation, XSS payloads, headers, and IDOR cases.
- `server npm run test:plans`: passed using a temporary database for Free defaults, Pro assignment, subscription persistence, and invalid-plan rejection.
- `server npm run test:recurrence`: passed for daily, weekly, month-end, and custom recurrence calculations.
- `server npm run test:recurrence-api`: passed using a spawned temporary server/database. It verifies server-side successor persistence and invalid recurrence rejection.
- `server npm run test:payment-webhook`: passed using a temporary database for HMAC verification, paid-plan activation, payment-order persistence, replay protection, `past_due` grace state, failure reason/attempt tracking, and cancellation persistence.
- `server npm run test:db-persistence`: passed using a temporary database. It verifies batched ordinary writes, timer-driven flush, explicit flush, synchronous transaction persistence, and the persisted database file.
- `server npm run test:task-version-conflict`: passed using a temporary API and database. It verifies stale task `PUT`, `PATCH`, `DELETE`, and completion requests return `409 TASK_VERSION_CONFLICT` with the current server task rather than overwriting it.
- `server npm run test:teams-api`: passed using a temporary server/database for Business team unlock, role allowlisting, guest invite rejection, role promotion, and ownership transfer.
- `server npm run test:admin-api`: passed using a temporary server/database for administrator overview authorization, user freeze auditing, frozen-token rejection, and account restoration.
- Administrator restart-boundary regression: passed after transactional account creation. The test creates two users, restarts the temporary server, grants the administrator role, and still observes both accounts before exercising the freeze flow.
- `server npm run test:account-api`: passed using a temporary server/database for privacy-safe export, incorrect deletion confirmation rejection, permanent deletion, and revoked token access.
- `server npm run test:attachments-api`: passed using a temporary server/database for owner download, authenticated cross-user denial, and anonymous download denial.
- Attachment signature regression: the upload integration test now rejects a plain-text payload declared as `image/png`, in addition to validating owner-only download behavior.
- Runtime verification after restart: frontend is listening on `5173`, backend is listening on `3001`, `GET /api/health` returns HTTP 200, and unauthenticated `GET /api/attachments/file/:filename` returns HTTP 401.
- Runtime verification after restart: the removed legacy `/api/ai/upgrade` route returns HTTP 404 for an authenticated ordinary user; the temporary verification account was deleted through the account-deletion API.
- Browser E2E: a new user registered successfully from `http://127.0.0.1:5173/register` after the CORS correction and reached the authenticated workspace.
- Browser E2E: a Free account was denied team creation with the visible `Business plan required for team management` message.
- Browser E2E: with browser networking forced offline, creating a task wrote a visible owner-scoped `POST /tasks` queue entry; restoring networking automatically flushed the queue and the task remained present after returning to Inbox. A visual screenshot was captured at `.playwright-cli/page-2026-08-02T05-06-57-742Z.png`.
- Static source scan: no browser-side AI key storage, obsolete AI settings tab, or client-supplied AI key/URL request field remains.
- Tauri and WeChat JSON configuration parsing: passed.
- Marketing desktop and registration mobile screenshots: captured and visually inspected in Chrome.
- Browser visual check after the latest restart: marketing desktop and mobile registration rendered without browser-console errors. Screenshots: `.playwright-cli/page-2026-08-02T05-29-44-702Z.png` and `.playwright-cli/page-2026-08-02T05-29-55-365Z.png`.
- Mobile workspace browser E2E: a local demo account registered, opened the 390px workspace, created `验证移动端任务流程` from the bottom navigation, and returned to Inbox where the task was present. Browser console errors: 0. Screenshots: `workspace-mobile-current.png` and `workspace-mobile-inbox-current.png`.
- `npm --prefix apps/mobile run sync`: passed and copied the latest production Web build into generated Android and iOS native projects.
- `npm --prefix apps/desktop run info`: Tauri configuration and restricted CSP loaded; WebView2 is present. Rust, Cargo and MSVC/Windows SDK are absent, so no desktop bundle was attempted.
- Cross-platform static validation: Tauri and WeChat JSON parse, and all WeChat JavaScript source files pass `node --check`.
- `server npm run test:ai-security`: passed using a temporary server/database. It verifies unauthenticated AI requests are rejected, a forged browser task/project snapshot is ignored in favor of authenticated server-owned rows, external image URLs are rejected, and the local text optimizer remains available.
- `git diff --check`: passed. Git only emitted line-ending conversion notices.
- Marketing information architecture browser check: the public home renders Hero, product workflow, calendar planning, AI analytics, team collaboration, pricing, security/privacy, FAQ, final CTA, and footer without browser-console errors.
- Public legal-route browser check: the cookie-notice Privacy control navigated to `/privacy`; the route rendered the data-use and retention boundary without requiring authentication.
- Expanded marketing visual regression: full-page desktop (`1440x1000`) and mobile (`390x844`) captures were inspected with no overlapping controls or clipped text. Screenshots: `marketing-expanded-desktop.png` and `marketing-expanded-mobile.png`.
- `server npm run test:task-version-conflict`: passed after extending the disposable-database contract to create and update `reminderAt` and `location`, while retaining stale-version rejection. Its isolated port range now avoids the default Vite port.
- `server npm run test:recurrence` and `server npm run test:recurrence-api`: passed after adding reminder-date propagation and location persistence to the server-created next recurring instance.
- `server npm run test:ai-security`: passed after extending coverage for the `/ai/extract-tasks` external-image rejection and post-operation `ai_usage` audit records. The assertions confirm no forged client task text is retained in audit messages.
- AI metering regression: the security test verifies that a valid image request denied by the hosted-AI entitlement returns its explanatory `blocked` result without an `ai_usage` audit entry, while successful organize/optimize requests remain metered.
- Quick Capture API contract regression: the AI security integration test now exercises authenticated text task extraction, verifies structured tasks are returned, and confirms the operation is audited.
- `server npm run test:shares-api`: passed using a temporary database. It verifies project sharing rejects an invalid `owner` invite role, accepts an allowed member role, and returns the persisted member in the authorized sharing list.
- `server npm run test:notification-state`: passed using a temporary database. It verifies a past reminder creates `reminder_due`, and moving that same reminder to the future removes the stale notification on the next refresh.
- Browser workspace regression: at the 390px authenticated workspace, `Ctrl+K` opened the focused, accessible command palette. Pressing `Enter` on its default `新建任务` command opened Quick Add and focused the task-title field.
- `server npm run test:auth-sessions`: passed using a temporary API/database. It verifies two independently issued device sessions, server-safe device labels, token refresh within the current session, remote revocation denying the old token, and current-device logout denying the refreshed token.
- Session hardening regression: root `npm run build`, `server node test/security.test.js` (`113/113`), `server npm run test:account-api`, and `server npm run test:ai-security` all passed after session validation was added to authentication middleware.
- `server npm run test:websocket-security`: passed with a temporary API/database. It verifies query-string tokens do not authenticate a socket, a first-frame authenticated connection receives only its own task event, another user remains isolated, and remote session revocation closes the active socket and invalidates its HTTP token.
- Real-time client regression: root `npm run build` passed after the workspace began using first-frame WebSocket authentication and debounced server refreshes for authenticated task/comment events.
- Platform synchronization regression: `npm --prefix apps/mobile run sync` rebuilt the current Web bundle and copied it into both generated Android and iOS projects. JSON parsing for Tauri/WeChat and `node --check` for every Mini Program JavaScript file passed; `tauri info` confirmed WebView2 and documented missing Rust/Cargo/MSVC components.
- Mini Program workflow regression: all configured page entries have their `.js`, `.json`, `.wxml`, and `.wxss` counterparts and all Mini Program JavaScript files pass `node --check`. The isolated authentication test verifies the Mini Program code-exchange endpoint safely returns `503` while AppID/AppSecret are absent instead of attempting an unauthenticated provider flow.

## Not Yet Verified

- Browser E2E interaction coverage for the new administrator, team, and account center flows.
- Live OAuth provider callback, because no provider credentials are configured.
- Live payment-provider webhook, because no provider endpoint/secret is configured.
- The currently running local backend process must be restarted to load the latest AI route implementation. The new AI behavior is verified against an isolated temporary server; the browser compatibility payload keeps the existing local process functional until that restart.
- Windows desktop, Android, iOS, and Mini Program executable build artifacts. Android/iOS source projects now exist, but their platform SDKs, signing material, and/or WeChat Developer Tools remain unavailable.

## Environment Constraints

- Cargo, Java, Gradle, ADB, Android SDK, macOS/Xcode, signing identities, a WeChat AppID, and payment/OAuth production credentials are not available in this environment.
- No executable, APK/AAB, iOS archive, payment production flow, public deployment, or signed release is claimed by this record.
