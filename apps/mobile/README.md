# TaskFlow Mobile

Capacitor wraps the production React build for Android and iOS. The native projects are present at `android/` and `ios/` and are synchronized from `../../dist` by `npm run sync`.

## Commands

```powershell
cd apps/mobile
npm install
npm run sync
npm run add:android
npm run add:ios
```

Set `VITE_API_URL` to an HTTPS API reachable by the device before generating a release build. Android requires Android Studio/SDK, JDK and signing credentials; iOS requires macOS/Xcode, CocoaPods and an Apple signing account. No signed package is included in this repository.
