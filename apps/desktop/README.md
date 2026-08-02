# TaskFlow Desktop

This is the Tauri v2 desktop wrapper for the existing React application. It uses the web build output and does not embed API credentials.

## Prerequisites

- Rust stable and Cargo
- Visual Studio C++ Build Tools and WebView2 on Windows
- `npm install` at the repository root

## Commands

From `apps/desktop`:

```powershell
npm install
npm run dev
npm run build
```

The wrapper uses a restricted CSP and only Tauri core permissions. The build produces a local installer only after the native toolchain is present. Signing identities are intentionally not stored in this repository. `npm run info` can be used to inspect local toolchain readiness.
