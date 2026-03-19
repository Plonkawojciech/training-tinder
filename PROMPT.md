# PROMPT RUNDA 5: athlix-trainmate — CRITICAL FIXES + PRODUCTION HARDENING

> Rundy 1-4 zrobione. Przeczytaj progress.md. NIE powtarzaj.
> ZASADY: (1) Po KAZDEJ zmianie wpisuj do progress.md. (2) Co 2-3 zmiany build+lint+test. (3) Rob WSZYSTKO. Dokladnosc > predkosc.
> CEL: Naprawic DEAL-BREAKERY. Projekt jest na 65-70% — brakujace 30% to krytyczne UX i integracje.

---

## 1. DEAL-BREAKER FIXES — NATYCHMIAST

### 1.1 Match score NIEWIDOCZNY na swipe cards
- [ ] Discover swipe card: WYSWIETL match score (np. "87% dopasowanie" badge)
- [ ] Score kolor: green >80%, yellow 60-80%, gray <60%
- [ ] Strava verified badge: checkmark na karcie

### 1.2 Session group chat BROKEN
- [ ] Wire do Pusher: private-session-{sessionId} channel
- [ ] Subscribe on mount, unsubscribe on leave
- [ ] Send -> broadcast -> all receive
- [ ] Fallback: "Odswiez" button

### 1.3 API errors — HARDCODED POLISH
KAZDY API route: zamien hardcoded strings na error codes
- [ ] "Brak autoryzacji" -> { error: { code: "UNAUTHORIZED" } }
- [ ] "Blad serwera" -> { error: { code: "SERVER_ERROR" } }
- [ ] Sprawdz WSZYSTKIE pliki w api/

### 1.4 Strava token refresh
- [ ] Access token expires 6h -> refresh flow
- [ ] Expired refresh_token -> disconnect + toast
- [ ] Strava disconnect: DELETE /api/strava/disconnect
- [ ] Rate limiting: backoff przy 200 req/15min limit

### 1.5 Crypto test FAILING — napraw
- [ ] Fix "throws on tampered ciphertext" test
- [ ] Dodaj integrity check (HMAC/GCM tag)
- [ ] SECURITY CRITICAL — Strava/Garmin tokens

---

## 2. PUSHER REAL-TIME

### Connection
- [ ] Disconnect indicator (zolty banner "Reconnecting...")
- [ ] Auto-reconnect z backoff
- [ ] Manual "Odswiez" button
- [ ] Cleanup on unmount

### Messages
- [ ] Typing indicator
- [ ] Online status (green dot)
- [ ] Load more (scroll up, 50/page)

### Session group chat
- [ ] MUSI uzyc Pusher (currently nie subskrybuje!)
- [ ] Channel: private-session-{sessionId}
- [ ] Events: message, typing, participant-joined/left

---

## 3. DISCOVER — UZUPELNIENIA
- [ ] Match score badge na kartach
- [ ] Strava badge na kartach
- [ ] Filter persist (nie resetuj)
- [ ] Infinite scroll (nie stop po 50)
- [ ] Empty state z CTA
- [ ] Sport pills: horizontal scroll na mobile

---

## 4. SESSIONS — UZUPELNIENIA
- [ ] Reviews: wire form do API
- [ ] Max participants: disable join gdy full
- [ ] Cancel: confirm modal
- [ ] GPX upload (opcjonalny)

---

## 5. MISSING PAGES — UZUPELNIJ

### Friends
- [ ] Accept/Reject buttons DZIALAJA
- [ ] Search po imieniu
- [ ] Empty state

### Stats
- [ ] Recharts: weekly volume, monthly, sport pie (PRAWDZIWE dane)
- [ ] Period selector

### Leaderboard
- [ ] Time range filter
- [ ] Your rank podswietlony

### Hub pages (4x)
- [ ] Dodaj content lub "Wkrotce" badge i usun z glownej nawigacji

### Calendar
- [ ] Month/week toggle
- [ ] Color coding
- [ ] "Dodaj" button

### Notifications
- [ ] Push subscribe toggle w settings
- [ ] Notification bell z badge

---

## 6. SETTINGS
- [ ] Privacy: publiczny/znajomi/nikt
- [ ] Block list
- [ ] Delete account
- [ ] Strava/Garmin disconnect
- [ ] Hardcoded labels -> i18n

---

## 7. i18n
- [ ] KAZDY API error -> code-based
- [ ] Onboarding 4 kroki
- [ ] Discover labels
- [ ] Session labels
- [ ] Empty states WSZYSTKIE
- [ ] Toast WSZYSTKIE
- [ ] ZERO hardcoded Polish

---

## 8. MOBILE 320px
- [ ] Swipe card: calc(100dvh - nav)
- [ ] Sport pills: horizontal scroll
- [ ] Chat: full screen
- [ ] Touch targets: 44px
- [ ] Font: min 14px

---

## 9. ACCESSIBILITY
- [ ] Swipe: keyboard arrows (left=pass, right=like)
- [ ] Chat: aria-live="polite"
- [ ] Bottom nav: role="navigation"
- [ ] Labels na inputs
- [ ] Focus visible w dark mode
- [ ] Skip to content

---

## 10. TESTY — cel 450+

### Fix:
```
crypto.test.ts: fix tampered ciphertext test
```

### New:
```
api/strava-disconnect.test.ts (6)
api/strava-refresh.test.ts (6)
api/sessions-review.test.ts (8)
api/sessions-chat.test.ts (8)
api/friends-request.test.ts (10)
api/notifications.test.ts (6)
api/discover-filters.test.ts (10)

components/swipe-card.test.tsx (12)
components/chat-window.test.tsx (12)
components/session-card.test.tsx (8)
components/friend-request.test.tsx (8)
components/notification-bell.test.tsx (6)
components/bottom-nav.test.tsx (6)

integration/discover-match.test.ts (8)
integration/session-lifecycle.test.ts (8)
integration/strava-flow.test.ts (6)
```

---

## 11. PERFORMANCE
- [ ] Discover: virtual scroll >50
- [ ] Messages: virtual scroll
- [ ] Recharts: lazy load
- [ ] Messages N+1: batch query

---

## 12. DATA CONSISTENCY
- [ ] Index na (lat, lon) w schema
- [ ] Session participants: Pusher broadcast on join/leave
- [ ] Match score: cache
- [ ] Strava: unique constraint na stravaId

---

## FINALIZACJA
- `npm run build` — 0 errors
- `npm run lint` — 0 errors
- `npm run test` — 450+ ALL passing (crypto fix!)
- Pusher: messages + group chat work
- Match score: WIDOCZNY
- Mobile 320px: OK
- Zaktualizuj progress.md
