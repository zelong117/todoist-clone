# Remaining Work

## Commercialization

- Integrate a selected payment provider using its official SDK and raw-body signature verification. Do not treat a browser callback as proof of payment.
- Select and integrate a real provider through its official SDK, then add provider-specific reconciliation operations before enabling public checkout. Signed generic events, idempotency, order history, cancellation state, and payment-failure grace tracking are now implemented.
- Add a provider-backed billing portal only after the concrete provider contract and cancellation/refund policy are defined. The current user page is a read-only subscription and payment-history view.

## Native Platforms

- Tauri, Capacitor, and WeChat project scaffolds are coded under `apps/`. Capacitor Android and iOS projects were re-synced against the current production web bundle, but no executable, APK/AAB, iOS archive, or Mini Program build exists. This environment does not contain Rust, Cargo, MSVC/Windows SDK components, Java, Gradle, Android SDK, device tooling, macOS/Xcode, CocoaPods, signing identities, a WeChat AppID, or WeChat Developer Tools.
- Validate each platform's secure token storage and notification permission flow separately from the PWA.

## Offline Collaboration

- The task mutation queue is coded and browser-verified for offline create/update/complete/delete. Stale replay is now blocked by `updatedAt` optimistic concurrency and surfaced for manual review. A future enhancement can offer field-level merge or a dedicated conflict-comparison drawer; it must preserve the current no-silent-overwrite behavior.
- Server-authoritative, revocable device sessions are implemented for web/password and OAuth sign-ins. Native secure storage, push-token registration, shared refresh-token rotation, and live multi-instance session state remain platform/deployment follow-up work.
- Single-instance live task/comment synchronization is implemented through authenticated WebSockets. A horizontally scaled deployment needs a shared pub/sub transport and durable offline message delivery; the current in-memory queue is intentionally not presented as multi-instance infrastructure.

## Runtime Reload Boundary

- The currently running local backend must be restarted before it can expose the latest reminder/location persistence and latest AI route hardening. Their behavior is covered by isolated temporary-server tests; do not treat the older long-running process as proof of the new code path.

## Data Scale

- The current `sql.js` storage batches ordinary writes for 150ms and flushes transaction commits synchronously. Evaluate a native SQLite driver or managed database before high-write or multi-instance production deployment.

## Operations

- Extend disposable-database integration fixtures across auth, IDOR, quota, AI failure modes, and high-volume pagination behavior.
- Add browser E2E coverage for the administrator console, team workspace, account export, and confirmation-based account deletion.
- Replace the in-memory OAuth state/code store with a shared short-lived store when deploying more than one backend instance.
- Review each existing route for ownership checks and add pagination to admin/activity-heavy endpoints.
- Add production CORS and HTTPS cookie configuration; local LAN patterns must not be used in production.
- Docker CLI is not installed in this environment, so `docker compose config`, image builds, and Nginx container startup remain unverified. The Compose file now requires `JWT_SECRET` rather than falling back to a public default; validate with `docker compose config --quiet` after Docker is installed.
