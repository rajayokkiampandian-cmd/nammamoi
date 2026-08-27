# Namma MOI Landing Wrapper Release

- Added a responsive mobile app preview without changing the approved landing sections.
- Added a separate Android APK download area and `/app` web fallback.
- APK download is intentionally disabled until a signed APK, version, size and SHA-256 are supplied in `assets/download-config.js`.
- First 365 days are presented as free; no premium purchase call-to-action was added.
- Existing public routes and legal pages remain intact.

Validation: JavaScript syntax, HTML references, duplicate IDs, public routes, default download lock and Android wrapper XML/security checks passed on 2026-08-27.
