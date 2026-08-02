# Platform Delivery Status

Updated: 2026-08-02

| Platform | Code | Build | Started | Tested | Signed/Published |
| --- | --- | --- | --- | --- | --- |
| Web | Yes | Yes | Yes, local ports 5173/3001 | Build, lint, API/security tests | Not published |
| PWA | Yes | Web build | Served locally | Shell/offline fallback and offline queue browser E2E verified | Not store-published |
| Windows desktop | Tauri v2 scaffold with restricted CSP and minimal capability | No | No | `tauri info` read configuration; WebView2 detected | No EXE; requires Rust, Cargo, MSVC/Windows SDK and signing |
| macOS desktop | Same Tauri scaffold | No | No | Configuration validated | Requires macOS/Xcode, signing and notarization |
| Android | Capacitor native project at `apps/mobile/android` | No AAB/APK | No | Production web assets synced into native project | Requires JDK, Android SDK/Gradle and signing |
| iOS | Capacitor Xcode project at `apps/mobile/ios` | No IPA | No | Production web assets synced into native project | Requires macOS/Xcode, CocoaPods and Apple signing |
| WeChat Mini Program | Native mini-program with code-exchange login, tasks, projects, AI review, notifications, account, and billing pages | No | No | Manifest/page completeness and JavaScript syntax validated | Requires AppID, approved HTTPS domain and WeChat Developer Tools |

## Paths And Commands

- Desktop: `apps/desktop`, then `npm install`, `npm run dev`, or `npm run build`.
- Mobile: `apps/mobile`, then `npm install` and `npm run sync`. The Android and iOS directories already exist; use `npm run open:android` or `npm run open:ios` on a machine with the corresponding IDE.
- WeChat: import `apps/wechat` into WeChat Developer Tools after setting `apps/wechat/utils/config.js` to an approved HTTPS API domain.

## Latest Verification

- `npm --prefix apps/mobile run sync`: passed after the current session and real-time changes. It rebuilt the web client and copied the current `index-a9eeOQCJ.js` bundle into both native projects; the copied Android and iOS asset names match `dist`.
- `npm --prefix apps/desktop run info`: configuration loaded and WebView2 was detected. Rust, Cargo and MSVC/Windows SDK are absent, so no desktop build was attempted.
- Mini Program `app.json`, Tauri JSON and all Mini Program JavaScript files parse successfully; every declared Mini Program page has its complete native page file set. WeChat Developer Tools is not installed, so there is no simulator build claim.
- Web public routes `/`, `/privacy`, and `/terms` are present in the same responsive client bundle as the authenticated workspace and administrator console. Marketing desktop and mobile browser captures were visually checked on 2026-08-02.

No platform artifact listed above is implied to be signed, released, published, installed, or store-listed unless a corresponding artifact path is added to this document.
