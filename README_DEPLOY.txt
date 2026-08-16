NAMMA MOI — FINAL PUBLIC LANDING WEBSITE
Prepared: 16 August 2026
Canonical domain: https://www.nammamoi.in/
Public support: support@nammamoi.in

PUBLIC PAGES
/                       Final landing / OAuth homepage
/privacy/               Privacy Policy
/terms/                 Terms of Use
/delete-account/        Public account/data deletion information

DOMAIN ROUTES HANDLED BY EXISTING CLOUDFLARE WORKER
/login                   Namma MOI login
/register                Namma MOI registration
/app                     Namma MOI app
/delete-account/start    Secure registered-email OTP deletion flow

IMPORTANT
- This static package deliberately does NOT hard-code a raw script.google.com URL.
- Keep the existing Cloudflare Worker routes active for /login*, /register*, /app* and /delete-account/start*.
- Keep all public CTAs on the domain routes /login, /register and /app.
- Google Play download CTA is intentionally omitted until the real public Play listing URL exists.

GITHUB + CLOUDFLARE PAGES DEPLOY
1. Backup the current landing repo/branch.
2. Copy the CONTENTS of this package into the existing GitHub-connected Cloudflare Pages repository root.
3. Commit to the production branch (normally main).
4. Wait for Cloudflare Pages build/deploy to finish.
5. Incognito-test without refresh:
   https://www.nammamoi.in/
   https://www.nammamoi.in/privacy/
   https://www.nammamoi.in/terms/
   https://www.nammamoi.in/delete-account/
   https://www.nammamoi.in/login
   https://www.nammamoi.in/register
   https://www.nammamoi.in/app
   https://www.nammamoi.in/delete-account/start
6. Confirm support@nammamoi.in forwards to nammamoi.app@gmail.com.

GOOGLE OAUTH BRANDING VALUES
App name: Namma MOI
Home page: https://www.nammamoi.in/
Privacy policy: https://www.nammamoi.in/privacy/
Terms of service: https://www.nammamoi.in/terms/
Authorized domain: nammamoi.in
User support email (Google account): nammamoi.app@gmail.com
Public support: support@nammamoi.in

GOOGLE PLAY ACCOUNT DELETION URL
https://www.nammamoi.in/delete-account/
