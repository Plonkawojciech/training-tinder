# Athlix TrainMate — Progress Log

**Projekt:** Platforma społecznościowa dla sportowców — znajdowanie partnerów treningowych, organizacja grupowych ride/sesji, śledzenie siłowni, czat w czasie rzeczywistym. PWA z odkrywaniem przez swipe.

---

## Uwaga: 100% AI Codebase

> Ten projekt jest w **100% pisany i utrzymywany przez agenty AI** (Claude opus-4.6 / sonnet) za pomocą Claude Code. Nie ma kodu pisanego ręcznie przez człowieka.

## Instrukcja dla agentów AI

> **OBOWIĄZEK:** Jako agent AI edytujący ten codebase — **musisz** zaktualizować ten plik po wprowadzeniu zmian. Dodaj wpis do sekcji Changelog poniżej z:
> - datą (YYYY-MM-DD)
> - krótkim opisem co zostało zmienione i dlaczego
> - dotkniętymi plikami/modułami
>
> To jest główny mechanizm śledzenia historii projektu. Git log pokazuje commity, ale ten plik daje AI kontekst semantyczny — co, dlaczego, i jakie moduły były dotknięte. Bez tego kolejny agent nie ma pełnego obrazu stanu projektu.

---

## Changelog

<!-- Dodawaj wpisy od najnowszego do najstarszego -->

| Data | Opis zmian | Dotknięte moduły |
|------|-----------|-----------------|
| 2026-03-17 | Accessibility, i18n & security fixes batch 5: (1) Added aria-labels to all icon-only navigation elements in mobile bottom nav, header, notification bell, lang toggle, theme toggle, (2) Made getSportLabel() i18n-aware — accepts optional lang parameter with PL/EN mapping object (default 'pl'), (3) Made formatRelativeTime() i18n-aware — accepts optional lang parameter, returns Polish by default ("przed chwilą", "5 min temu") and English when lang='en', (4) Added Content-Security-Policy header + security headers (X-Frame-Options, X-Content-Type-Options, XSS-Protection, Referrer-Policy, Permissions-Policy) to next.config.ts, modeled after athlix-health project, (5) Updated and expanded tests — 55 tests passing | components/layout/mobile-bottom-nav.tsx, components/layout/header.tsx, components/notifications/notification-bell.tsx, components/lang-toggle.tsx, components/theme-toggle.tsx, lib/utils.ts, next.config.ts, __tests__/utils.test.ts |
| 2026-03-17 | UX/perf/security audit fixes batch 4: (1) Created skeleton UI component (components/ui/skeleton.tsx) and Suspense-based loading skeleton for app routes (app/(app)/loading.tsx), (2) Lazy-loaded heavy components with next/dynamic ssr:false — GymMap in gym/finder, ChatWindow in messages, GroupChat in sessions/[id], (3) Reduced JWT token expiry from 30d to 7d for improved security (lib/jwt.ts), (4) Added custom 404 page in Polish matching dark theme (app/not-found.tsx), (5) Added global focus-visible keyboard accessibility styles for buttons/links (app/globals.css), (6) Google Maps loader (lib/maps-loader.ts) confirmed already lazy — only imported by map components, not at layout level | components/ui/skeleton.tsx (new), app/(app)/loading.tsx (new), app/not-found.tsx (new), app/(app)/gym/finder/page.tsx, app/(app)/messages/page.tsx, app/(app)/sessions/[id]/page.tsx, lib/jwt.ts, app/globals.css |
| 2026-03-17 | Testing & quality improvements: (1) Added vitest test framework with 50 unit tests across 5 test files covering crypto, jwt, strava, utils, rate-limit modules, (2) Created React ErrorBoundary component wrapping main content in app layout, (3) Refactored Profile PUT route — replaced 25 lines of repetitive ternary patterns with Object.fromEntries/filter spread, (4) Moved dotenv from dependencies to devDependencies (only used in drizzle.config.ts), (5) Fixed inconsistent error language — replaced all English API error messages (Unauthorized, Internal server error, Not found, Forbidden) with Polish equivalents across 64+ API route files | __tests__/*.test.ts (new), vitest.config.ts (new), components/error-boundary.tsx (new), app/(app)/layout.tsx, app/api/users/profile/route.ts, package.json, app/api/**/route.ts (64+ files) |
| 2026-03-17 | Performance & security audit fixes batch 2: (1) Sessions GET now filters sport and bbox at DB level via WHERE clauses instead of JS, (2) Strava sync uses batch INSERT for activities (chunks of 50) instead of sequential per-row inserts, (3) Messages endpoint has pagination (limit/offset, default 50, ordered by createdAt desc), (4) Fixed password placeholder mismatch (6→8 chars), (5) Change-password endpoint now issues fresh JWT cookie after password update, (6) Pusher auth allows session-{id} channels if user is a participant (DB check), (7) Review rating rejects non-integer values, (8) Change-password endpoint has rate limiting (5 per 15 min) | app/api/sessions/route.ts, lib/strava.ts, app/api/messages/route.ts, app/login/page.tsx, app/api/auth/change-password/route.ts, app/api/pusher/auth/route.ts, app/api/sessions/[id]/review/route.ts |
| 2026-03-17 | Audit fixes: (1) Added composite DB indexes on 25+ frequently queried columns in schema.ts, (2) Extracted shared Strava module lib/strava.ts to eliminate massive code duplication between callback/sync routes (reduced from 900+ lines to ~250 combined), (3) Cleaned up legacy Clerk references: removed CLERK_CONFIGURED, img.clerk.com remote pattern, fixed package.json name to athlix-trainmate, added JSDoc comment on users.clerkId, (4) Fixed cascade deletion: session DELETE now cleans up sessionMessages + sessionReviews + sessionParticipants, forum post DELETE now cleans up forumComments + forumLikes, (5) Removed hardcoded "online" status and green dot from chat header, (6) Removed userScalable:false and maximumScale:1 from viewport config for accessibility | lib/db/schema.ts, lib/strava.ts (new), app/api/strava/callback/route.ts, app/api/strava/sync/route.ts, lib/auth.ts, next.config.ts, package.json, app/api/sessions/[id]/route.ts, app/api/forum/posts/[id]/route.ts, components/messages/chat-window.tsx, app/layout.tsx |
| 2026-03-17 | Security fixes: (1) AES-256-GCM encryption for Garmin passwords via new lib/crypto.ts, (2) Strava auth callback now sets proper JWT tt_auth cookie instead of raw tt_user_id, (3) /api/push/send authorization check (self/friends/shared session), (4) /settings added to middleware PROTECTED routes, (5) Session messages max length 2000 chars | lib/crypto.ts, app/api/integrations/garmin/route.ts, lib/db/schema.ts, app/api/strava/callback/route.ts, app/api/push/send/route.ts, middleware.ts, app/api/sessions/[id]/messages/route.ts |
| 2026-03-17 | Inicjalizacja pliku progress.md | — |
