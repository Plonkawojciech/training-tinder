'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Lang = 'pl' | 'en';

const T = {
  // Navigation
  nav_dashboard:   { pl: 'Dashboard',   en: 'Dashboard' },
  nav_discover:    { pl: 'Odkryj',       en: 'Discover' },
  nav_sessions:    { pl: 'Sesje',        en: 'Sessions' },
  nav_messages:    { pl: 'Wiadomości',   en: 'Messages' },
  nav_forum:       { pl: 'Forum',        en: 'Forum' },
  nav_leaderboard: { pl: 'Ranking',      en: 'Leaderboard' },
  nav_profile:     { pl: 'Profil',       en: 'Profile' },
  nav_friends:     { pl: 'Znajomi',      en: 'Friends' },
  nav_new_session: { pl: '+ Nowa Sesja', en: '+ New Session' },
  nav_feed: { pl: 'Feed', en: 'Feed' },

  // Mobile bottom nav
  mob_discover:  { pl: 'Odkryj',   en: 'Discover' },
  mob_sessions:  { pl: 'Sesje',    en: 'Sessions' },
  mob_chat:      { pl: 'Chat',     en: 'Chat' },
  mob_profile:   { pl: 'Profil',   en: 'Profile' },

  // Login
  login_title:       { pl: 'TrainingTinder',                         en: 'TrainingTinder' },
  login_subtitle:    { pl: 'Znajdź partnera do treningu.\nSwipuj. Trenuj. Rywalizuj.', en: 'Find your training partner.\nSwipe. Train. Compete.' },
  login_email_label: { pl: 'Twój email',                             en: 'Your email' },
  login_placeholder: { pl: 'jan@kowalski.pl',                        en: 'john@example.com' },
  login_btn:         { pl: 'Wejdź do aplikacji →',                   en: 'Enter app →' },
  login_loading:     { pl: 'Logowanie...',                           en: 'Signing in...' },
  login_tagline:     { pl: 'Bez hasła · Bez rejestracji · Tylko email', en: 'No password · No sign-up · Just email' },

  // Dashboard
  dash_welcome:      { pl: 'Witaj z powrotem',  en: 'Welcome back' },
  dash_command:      { pl: 'Twoje centrum treningowe', en: 'Your training command center' },
  dash_ready:        { pl: 'Gotowy na trening?', en: 'Ready to train?' },
  dash_swipe_title:  { pl: 'Swipuj sportowców',  en: 'Swipe athletes' },
  dash_swipe_sub:    { pl: 'Znajdź partnera do treningu', en: 'Find your training partner' },
  dash_new_session:  { pl: 'Nowa sesja',          en: 'New session' },
  dash_new_sub:      { pl: 'Zaproś innych do treningu', en: 'Invite others to train' },
  dash_recent:       { pl: 'Ostatnia aktywność',  en: 'Recent activity' },
  dash_hubs:         { pl: 'Portale treningowe',  en: 'Training Hubs' },
  dash_quick:        { pl: 'Szybkie akcje',        en: 'Quick Actions' },
  dash_hub_end:      { pl: 'Wytrzymałość',         en: 'Endurance' },
  dash_hub_str:      { pl: 'Siłownia',             en: 'Strength' },
  dash_hub_soc:      { pl: 'Społeczność',          en: 'Social' },
  dash_hub_ana:      { pl: 'Statystyki',           en: 'Analytics' },

  // Discover
  disc_title:     { pl: 'Odkryj',          en: 'Discover' },
  disc_nearby:    { pl: 'sportowców w pobliżu', en: 'athletes nearby' },
  disc_swipe:     { pl: 'Swipe',           en: 'Swipe' },
  disc_list:      { pl: 'Lista',           en: 'List' },
  disc_map:       { pl: 'Mapa',            en: 'Map' },
  disc_loading:   { pl: 'Ładowanie...',    en: 'Loading...' },
  disc_radius:    { pl: 'Zasięg',          en: 'Radius' },

  // Swipe card
  card_away:      { pl: 'km stąd',   en: 'km away' },
  card_like:      { pl: 'LIKE',      en: 'LIKE' },
  card_pass:      { pl: 'PASS',      en: 'PASS' },
  card_super:     { pl: 'SUPER',     en: 'SUPER' },

  // Match popup
  match_title: { pl: 'MACIE MATCH!', en: "IT'S A MATCH!" },
  match_body:  { pl: 'Wy i %name% polubiliście się nawzajem!', en: 'You and %name% liked each other!' },
  match_swipe: { pl: 'Szukaj dalej →', en: 'Keep Swiping →' },
  match_msg:   { pl: 'Wyślij wiadomość', en: 'Send a Message' },

  // Sessions
  sess_title:   { pl: 'Sesje',        en: 'Sessions' },
  sess_new:     { pl: 'Nowa sesja',   en: 'New session' },
  sess_join:    { pl: 'Dołącz',       en: 'Join' },
  sess_leave:   { pl: 'Opuść',        en: 'Leave' },

  // Profile
  prof_edit:    { pl: 'Edytuj profil',    en: 'Edit profile' },
  prof_save:    { pl: 'Zapisz',           en: 'Save' },
  prof_cancel:  { pl: 'Anuluj',           en: 'Cancel' },
  prof_bio:     { pl: 'Bio',              en: 'Bio' },
  prof_city:    { pl: 'Miasto',           en: 'City' },
  prof_sports:  { pl: 'Sporty',           en: 'Sports' },
  prof_pace:    { pl: 'Tempo',            en: 'Pace' },
  prof_weekly:  { pl: 'Km tygodniowo',    en: 'Weekly km' },

  // PWA install
  pwa_title:   { pl: 'Dodaj do ekranu głównego', en: 'Add to Home Screen' },
  pwa_ios:     { pl: 'Naciśnij □↑ → Dodaj do ekranu głównego', en: 'Tap □↑ → Add to Home Screen' },
  pwa_android: { pl: 'Działa jak natywna aplikacja', en: 'Works like a native app' },
  pwa_install: { pl: 'Instaluj', en: 'Install' },

  // Chat
  chat_placeholder: { pl: 'Napisz wiadomość...', en: 'Write a message...' },
  chat_empty:       { pl: 'Napisz pierwszą wiadomość', en: 'Say hello!' },

  // General
  gen_logout:  { pl: 'Wyloguj',  en: 'Log out' },
  gen_loading: { pl: 'Ładowanie...', en: 'Loading...' },
  gen_error:   { pl: 'Błąd',     en: 'Error' },
  gen_save:    { pl: 'Zapisz',   en: 'Save' },
  gen_cancel:  { pl: 'Anuluj',   en: 'Cancel' },
  gen_close:   { pl: 'Zamknij',  en: 'Close' },
  gen_back:    { pl: 'Wróć',     en: 'Back' },
  gen_next:    { pl: 'Dalej',    en: 'Next' },

  // Friends feed
  feed_empty:               { pl: 'Dodaj znajomych, żeby widzieć ich aktywności', en: 'Add friends to see their activities' },
  feed_comment_placeholder: { pl: 'Napisz komentarz...', en: 'Write a comment...' },
  feed_title:               { pl: 'Feed znajomych', en: 'Friends feed' },
} as const;

export type TKey = keyof typeof T;

interface LangCtx { lang: Lang; setLang: (l: Lang) => void; t: (key: TKey, vars?: Record<string, string>) => string; }

const Ctx = createContext<LangCtx>({ lang: 'pl', setLang: () => {}, t: (k) => k });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('pl');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tt-lang') as Lang | null;
      if (saved === 'pl' || saved === 'en') setLangState(saved);
    } catch {}
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    try { localStorage.setItem('tt-lang', l); } catch {}
  }

  function t(key: TKey, vars?: Record<string, string>): string {
    let str = T[key][lang];
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`%${k}%`, v) as typeof str;
      }
    }
    return str;
  }

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLang() { return useContext(Ctx); }
