'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { LangToggle } from '@/components/lang-toggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const router = useRouter();
  const { t } = useLang();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (res.ok && data.success) {
        router.push('/dashboard');
      } else {
        setError(data.error ?? 'Coś poszło nie tak');
      }
    } catch {
      setError('Błąd połączenia');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 20 }}>
        <LangToggle />
      </div>

      {/* Ambient glows */}
      <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(252,76,2,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Background decorative cards */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <div style={{ position: 'absolute', width: 280, height: 380, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: 32, border: '1px solid rgba(255,255,255,0.06)', transform: 'rotate(8deg) translateY(-20px) scale(0.88)', opacity: 0.35 }} />
        <div style={{ position: 'absolute', width: 280, height: 380, background: 'linear-gradient(135deg, #1a1a1a 0%, #252525 100%)', borderRadius: 32, border: '1px solid rgba(255,255,255,0.08)', transform: 'rotate(4deg) translateY(-10px) scale(0.94)', opacity: 0.5 }} />
        <div style={{ position: 'absolute', width: 280, height: 380, borderRadius: 32, border: '1px solid rgba(124,58,237,0.3)', overflow: 'hidden', background: 'linear-gradient(160deg, #1f1f1f 0%, #141414 100%)', boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(124,58,237,0.08)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)' }} />
          <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #FC4C02, #ff7a3f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🚴</div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 18px 18px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 4 }}>Marcin K.</div>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 10 }}>📍 Warszawa · Strava ✓</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Cycling', 'Running'].map(s => (
                <span key={s} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(252,76,2,0.2)', border: '1px solid rgba(252,76,2,0.4)', color: '#FC4C02', fontWeight: 600 }}>{s}</span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>⚡ 28.4 km/h · 🛣 320 km/wk</div>
          </div>
          <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,204,68,0.2)', border: '1px solid rgba(0,204,68,0.5)', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#00CC44' }}>92% match</div>
        </div>
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-[360px] mx-4" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 28, padding: '44px 36px 40px', backdropFilter: 'blur(20px)', boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)', marginTop: 160 }}>

        {/* Logo */}
        <div className="text-center mb-8">
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)', boxShadow: '0 8px 24px rgba(124,58,237,0.4)', marginBottom: 16, fontSize: 24 }}>⚡</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', letterSpacing: -0.5, lineHeight: 1.1, marginBottom: 8 }}>TrainingTinder</h1>
          <p style={{ color: '#777', fontSize: 13, lineHeight: 1.5 }}>
            Znajdź partnerów treningowych.<br />Połącz Stravę i zacznij.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* PRIMARY: Strava login */}
          <a
            href="/api/strava/connect?mode=auth"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', background: '#FC4C02', border: 'none', borderRadius: 14,
              padding: '15px', color: 'white', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', textDecoration: 'none',
              boxShadow: '0 6px 20px rgba(252,76,2,0.35)',
              transition: 'all 0.2s',
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: 'white', flexShrink: 0 }}>
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Zaloguj przez Stravę
          </a>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>lub</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* SECONDARY: Email */}
          {!showEmail ? (
            <button
              onClick={() => setShowEmail(true)}
              style={{
                width: '100%', background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
                padding: '13px', color: '#888', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              Kontynuuj przez email
            </button>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jan@example.com"
                autoFocus
                required
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
                  padding: '14px 16px', color: 'white', fontSize: 15,
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(124,58,237,0.6)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
              {error && <p style={{ color: '#FF6B6B', fontSize: 13, margin: '0 4px' }}>{error}</p>}
              <button
                type="submit"
                disabled={loading || !email.trim()}
                style={{
                  width: '100%',
                  background: loading || !email.trim() ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
                  border: 'none', borderRadius: 14, padding: '14px',
                  color: 'white', fontSize: 15, fontWeight: 700,
                  cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                  boxShadow: loading || !email.trim() ? 'none' : '0 6px 20px rgba(124,58,237,0.35)',
                }}
              >
                {loading ? 'Logowanie...' : t('login_btn')}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', color: '#444', fontSize: 11, marginTop: 24, lineHeight: 1.5 }}>
          Łącząc się przez Stravę automatycznie importujemy Twoje km, sporty i statystyki.
        </p>
      </div>
    </div>
  );
}
