# Athlix TrainMate
---

## 100% AI Codebase — Instrukcja dla agentów

> Ten codebase jest w **100% pisany i utrzymywany przez agenty AI** (Claude opus-4.6 / sonnet) via Claude Code. Nie ma kodu pisanego ręcznie przez człowieka.
>
> **OBOWIĄZEK:** Po każdej zmianie w tym projekcie zaktualizuj `progress.md` w root projektu:
> - Data (YYYY-MM-DD)
> - Krótki opis co zmieniono i dlaczego
> - Dotknięte pliki/moduły
>
> `progress.md` to semantyczny tracker historii projektu — git log rejestruje commity, ale `progress.md` daje kolejnym agentom pełny kontekst: co, dlaczego, jakie moduły.


Social platform for athletes — find training partners, organize group rides/sessions, gym tracking, community features, real-time messaging. PWA with swipe-based discovery.

## Tech Stack

- Next.js 16.1, React 19, TypeScript
- Neon PostgreSQL + Drizzle ORM (schema at `lib/db/schema.ts`)
- jose (JWT auth — custom, cookie: `tt_auth`)
- Pusher + pusher-js (real-time messaging/notifications)
- Google Maps (`@googlemaps/js-api-loader`)
- Vercel Blob (`@vercel/blob`) for file uploads
- Garmin Connect (`garmin-connect`) for activity sync
- bcryptjs for password hashing
- web-push for push notifications
- Radix UI primitives (Avatar, Dialog, Dropdown, Progress, Select, Switch, Tabs, Toast)
- date-fns, clsx, tailwind-merge
- Tailwind CSS v4
- Fonts: Inter + Syne

## Project Structure

```
app/
  page.tsx                # Landing page
  layout.tsx              # Root layout (ThemeProvider, LangProvider, PWA service worker)
  login/                  # Login page
  register/               # Registration
  onboarding/             # New user onboarding flow
  settings/               # User settings
  (auth)/                 # Auth layout group
  (app)/                  # Protected app layout group
    layout.tsx            # App shell (sidebar/nav)
    dashboard/            # Main dashboard
    discover/             # Swipe-based partner discovery
    feed/                 # Activity feed
    friends/              # Friends list
    messages/             # Real-time chat (Pusher)
    sessions/             # Training sessions
    calendar/             # Calendar view
    events/               # Community events
    leaderboard/          # Rankings
    stats/                # Personal statistics
    forum/                # Discussion forum + [id] threads
    profile/              # User profile
    training/             # Training plans
    gym/                  # Gym module
      page.tsx            # Gym dashboard
      finder/             # Gym finder (Google Maps)
      live/               # Live workout tracking
      log/                # Workout log
      plans/              # Training plans + [id] detail
      records/            # Personal records
    hubs/                 # Community hubs
      analytics/          # Analytics hub
      endurance/          # Endurance sports hub
      social/             # Social hub
      strength/           # Strength sports hub
  api/
    auth/                 # login, register, logout, me, profile, change-password
    achievements/         # Achievement system
    checkin/              # Venue check-ins
    discover/             # Discovery/matching API
    events/               # Events CRUD
    feed/                 # Activity feed
    follow/               # Follow system
    forum/                # Forum threads/posts
    friends/              # Friend requests
    garmin/               # Garmin integration
    integrations/         # External services
    leaderboard/          # Rankings
    maps/                 # Google Maps geocoding
    matches/              # Partner matching
    messages/             # Chat messages
    notifications/        # Push notifications
    plans/                # Training plans
    push/                 # Web push subscription
    pusher/               # Pusher auth
    records/              # Personal records
    session-series/       # Recurring sessions
    sessions/             # Training sessions
    sport-profiles/       # Sport-specific profiles
    spotter/              # Gym spotter requests
    stats/                # Statistics
    strava/               # Strava integration
    swipes/               # Discovery swipes
    training/             # Training data
    upload/               # File uploads (Vercel Blob)
    users/                # User management
    workouts/             # Workout data
components/
  layout/                 # App shell, sidebar, nav
  landing-page.tsx        # Landing page component
  athletes/               # Athlete profile cards
  calendar/               # Calendar components
  discover/               # Swipe discovery UI
  feed/                   # Activity feed
  forum/                  # Forum components
  gym/                    # Gym tracker components
  maps/                   # Google Maps integration
  messages/               # Chat UI (Pusher-backed)
  notifications/          # Notification components
  onboarding/             # Onboarding flow
  profile/                # Profile components
  reviews/                # Review/rating components
  sessions/               # Session components
  stats/                  # Statistics/charts
  strava/                 # Strava connection
  ui/                     # Shared UI primitives (shadcn-style)
  lang-toggle.tsx         # PL/EN language switcher
  theme-toggle.tsx        # Dark/light toggle
  push-registrar.tsx      # Push notification registration
  pwa-install-button.tsx  # PWA install prompt
lib/
  db/
    index.ts              # Neon DB connection
    schema.ts             # Drizzle schema
    migrate.ts            # Migration runner
  auth.ts                 # Auth helpers
  jwt.ts                  # JWT token utils
  server-auth.ts          # Server-side auth
  matching.ts             # Partner matching algorithm
  exercises.ts            # Exercise database
  maps-loader.ts          # Google Maps loader
  maps.ts                 # Maps utility functions
  push.ts                 # Web push helpers
  lang.tsx                # LangProvider context (PL/EN)
  theme.tsx               # ThemeProvider context
  utils.ts                # General utilities
middleware.ts             # JWT auth — protects /dashboard, /profile, /messages, etc.
drizzle.config.ts         # Drizzle Kit config
```

## Running

```bash
npm run dev      # http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

## Environment Variables

```
DATABASE_URL=              # Neon PostgreSQL
JWT_SECRET=                # JWT signing secret
NEXT_PUBLIC_PUSHER_KEY=    # Pusher (real-time)
NEXT_PUBLIC_PUSHER_CLUSTER=
PUSHER_APP_ID=
PUSHER_SECRET=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=  # Google Maps
BLOB_READ_WRITE_TOKEN=    # Vercel Blob
GARMIN_EMAIL=              # Garmin Connect
GARMIN_PASSWORD=
VAPID_PUBLIC_KEY=          # Web push
VAPID_PRIVATE_KEY=
```

## Key Conventions

- Custom JWT auth (NOT Clerk) — cookie name `tt_auth`, verified in `middleware.ts`
- Protected routes defined explicitly in middleware: dashboard, profile, messages, sessions, calendar, discover, leaderboard, onboarding, gym, feed, stats, forum
- Route groups: `(app)` for protected pages, `(auth)` for auth pages
- Real-time messaging via Pusher (not WebSockets directly)
- PWA: manifest.json, service worker registered in layout, push notifications
- Bilingual PL/EN via `LangProvider` in `lib/lang.tsx`
- Dark/light theme via custom `ThemeProvider` in `lib/theme.tsx`
- Google Maps for gym finder and location-based discovery
- Drizzle schema at `lib/db/schema.ts`, migrations output to `./drizzle/`
- Radix UI + shadcn-style components in `components/ui/`
