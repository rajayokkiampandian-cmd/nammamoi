# Namma MOI Landing Wrapper Release

- Added a responsive mobile app preview without changing the approved landing sections.
- Added a separate Android APK download area and `/app` web fallback.
- APK download is intentionally disabled until a signed APK, version, size and SHA-256 are supplied in `assets/download-config.js`.
- First 365 days are presented as free; no premium purchase call-to-action was added.
- Existing public routes and legal pages remain intact.

Validation: JavaScript syntax, HTML references, duplicate IDs, public routes, default download lock and Android wrapper XML/security checks passed on 2026-08-27.

## Full-screen stabilization — 2026-08-28

- Added JS-enforced Tamil/English isolation so stale or delayed CSS cannot display both languages.
- Bumped shared CSS/JS cache versions on the landing and all legal pages.
- Improved large-desktop scale, tablet spacing, 420px mobile density, keyboard focus and reduced-motion behavior.
- Preserved the wrapper preview, disabled-until-verified APK gate, routes, legal content and approved brand sections.

## Requirement correction — 2026-08-29

- Removed all user-facing WebView/wrapper wording.
- Kept only the main Namma MOI Android app preview, verified-APK download button and Web app fallback.
- Removed pending version/size/checksum placeholders until a real signed APK is available.
