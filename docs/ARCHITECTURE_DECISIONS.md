# Architecture Decisions

## Shared Client Boundary (2026-08-02)

Project member sharing uses `sharesAPI` in the same client request layer as tasks, teams, billing, and account operations. This removes component-local base URLs and token reads so web, PWA, desktop, and mobile wrappers all follow the configured API endpoint and authentication convention. The legacy `src/pages/Admin.tsx` is not mounted by the current route tree; the active administrator surface is `AdminConsole`.

Project invitation roles are a server-side closed set: `admin`, `member`, and `viewer`. Project ownership remains derived from `projects.user_id`, so a request cannot create an owner-level project membership.

## Keep The Existing Web App

The repository is a working Vite + React + TypeScript client and Express + sql.js server. A monorepo migration is deferred because it would create migration risk without improving the current demo. Shared API types and business rules should be extracted only when a second client is implemented.

## Service-Owned Entitlements

Plans, quotas, roles, and plan expiry remain server-owned. The client may display a plan and request an upgrade flow, but it must not be the authority for entitlement changes. Administrative plan changes are authenticated and role-checked.

The current catalog is Free, Pro, and Business. `subscriptions` preserves the effective assignment history and `payment_orders` reserves immutable payment-provider event data. There is intentionally no public upgrade endpoint: production checkout requires a provider-specific, signature-verified webhook before it may update an entitlement.

## OAuth Boundary

OAuth providers return to the server with a provider authorization code. Google uses state and S256 PKCE. The server exchanges provider credentials, creates a one-time 60-second login code, and redirects without a JWT. The client exchanges that code over POST and stores the normal application token.

## PWA Cache Boundary

The service worker caches only the application shell and static same-origin resources. `/api/` and upload paths are excluded. Authentication tokens and sensitive API responses are never written to the service-worker cache.

## sql.js Write Persistence

`sql.js` exports the full database file when persisting. Ordinary writes are therefore coalesced for up to 150ms, while explicit transactions persist synchronously at commit and graceful shutdown flushes any pending writes. This bounds the crash window while avoiding one full database export per isolated mutation. A native SQLite-driver migration remains a scale decision, not an untested in-place replacement.

## Desktop And Mobile Strategy

The Web/PWA experience is the verified deliverable in this environment. Tauri is the preferred desktop wrapper and Capacitor is the preferred first mobile wrapper because both can reuse the React presentation and API boundary. Native release artifacts still require their platform toolchains and signing credentials.
