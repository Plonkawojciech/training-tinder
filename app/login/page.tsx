'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email: email.trim(), password }
        : { email: email.trim(), password, displayName };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
    padding: '14px 16px', color: 'var(--text)', fontSize: 15,
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>

      <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Decorative cards */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{ position: 'absolute', width: 280, height: 380, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: 32, border: '1px solid rgba(255,255,255,0.06)', transform: 'rotate(8deg) translateY(-20px) scale(0.88)', opacity: 0.35 }} />
        <div style={{ position: 'absolute', width: 280, height: 380, background: 'linear-gradient(135deg, #1a1a1a 0%, #252525 100%)', borderRadius: 32, border: '1px solid rgba(255,255,255,0.08)', transform: 'rotate(4deg) translateY(-10px) scale(0.94)', opacity: 0.5 }} />
        <div style={{ position: 'absolute', width: 280, height: 380, borderRadius: 32, border: '1px solid rgba(99,102,241,0.3)', overflow: 'hidden', background: 'linear-gradient(160deg, #1f1f1f 0%, #141414 100%)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)' }} />
          <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #6366F1, #818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>⚡</div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 18px 18px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 4 }}>Wojtek P.</div>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 10 }}>📍 Kraków · Strava ✓</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['Cycling', 'Triathlon'].map(s => (
                <span key={s} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#818CF8', fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Card */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 360, margin: '0 16px', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 28, padding: '40px 36px 36px', boxShadow: '0 32px 80px rgba(0,0,0,0.7)', marginTop: 120 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)', marginBottom: 14, fontSize: 22 }}>⚡</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5, lineHeight: 1.1, marginBottom: 6, fontFamily: 'var(--font-syne, Syne, sans-serif)' }}>TrainMate</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Znajdź partnera do treningu</p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 24, gap: 4 }}>
          {(['login', 'register'] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: mode === m ? 'linear-gradient(135deg, #6366F1, #818CF8)' : 'transparent',
                color: mode === m ? 'white' : 'var(--text-muted)',
                boxShadow: mode === m ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                transition: 'all 0.2s',
              }}>
              {m === 'login' ? 'Logowanie' : 'Rejestracja'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mode === 'register' && (
            <input
              type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Imię / pseudonim" style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
            />
          )}
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" required style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
          />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'register' ? 'Hasło (min. 8 znaków)' : 'Hasło'} required style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
          />

          {error && <p style={{ color: '#FF6B6B', fontSize: 13, margin: '0 4px' }}>{error}</p>}

          <button type="submit" disabled={loading || !email.trim() || !password}
            style={{
              marginTop: 4, width: '100%',
              background: loading || !email.trim() || !password ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
              border: 'none', borderRadius: 14, padding: '15px',
              color: 'white', fontSize: 15, fontWeight: 700,
              cursor: loading || !email.trim() || !password ? 'not-allowed' : 'pointer',
              boxShadow: loading || !email.trim() || !password ? 'none' : '0 6px 20px rgba(99,102,241,0.35)',
              transition: 'all 0.2s',
            }}>
            {loading ? (mode === 'login' ? 'Logowanie...' : 'Rejestracja...') : (mode === 'login' ? 'Zaloguj się' : 'Utwórz konto')}
          </button>
        </form>
      </div>
    </div>
  );
}
