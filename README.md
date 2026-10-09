# Animate (AniMate)

Frame-by-frame animation app. The whole app is `www/index.html` (no internet or external libraries needed).

## Build the APK on GitHub
1. Create a new GitHub repo and upload everything in this folder (keep the `.github` folder).
2. Open the **Actions** tab, enable workflows, and run **Build Android APK** (or just push to `main`).
3. When it finishes, open the run and download **Animate-debug-apk** from *Artifacts*. Unzip it and install `app-debug.apk`.

To change the package name, edit `appId` in `capacitor.config.json` (before the first build).

## Notes
- Projects are stored on the device (IndexedDB). Use File > Save backup (.anim) for safe copies.
- Export saves through the system share sheet (Save to Files / Drive / Gallery).
- iOS later: run `npx cap add ios` on a Mac (or a macOS GitHub runner) and build in Xcode.
- Ads, watermark and the watermark-removal purchase are not included yet.
