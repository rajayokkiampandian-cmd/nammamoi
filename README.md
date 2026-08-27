# Namma MOI Android Web Wrapper

This secondary Android wrapper opens `https://www.nammamoi.in/app`. Its package ID is `in.nammamoi.webwrapper`, so it does not overwrite the primary app (`in.nammamoi.app`).

Security: HTTPS only, no JavaScript bridge, mixed content blocked, SSL failures cancelled, Namma MOI hosts stay inside the app, and external links open in the system browser.

Build with Android Studio (JDK 17 / Android SDK 35), then run `./gradlew assembleRelease` after adding the release signing configuration. Do not publish or link an APK before signing, device testing, malware scanning and SHA-256 verification.
