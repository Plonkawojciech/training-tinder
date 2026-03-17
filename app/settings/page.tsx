'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, LogOut, Check, Loader2, Activity, Unlink, Link as LinkIcon, Zap, ExternalLink } from 'lucide-react'
import { useLang } from '@/lib/lang'

// ── Shared styles ──────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 20, padding: '20px 24px', marginBottom: 12,
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'var(--text-muted)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.05em',
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 12, padding: '12px 14px', color: 'var(--text)', fontSize: 15,
  outline: 'none', boxSizing: 'border-box',
}
const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 600,
  background: 'linear-gradient(135deg,#6366F1,#818CF8)',
  color: 'white', boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
}
const dangerBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 600,
  background: 'rgba(239,68,68,0.12)', color: '#EF4444',
}
const ghostBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 12px', borderRadius: 10, border: '1px solid var(--accent)',
  cursor: 'pointer', fontSize: 12, fontWeight: 600,
  background: 'rgba(99,102,241,0.08)', color: '#6366F1',
}
const sectionTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, marginTop: 4,
}

// ── Account ────────────────────────────────────────────────────────────────────
function AccountSection() {
  const { lang } = useLang()
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then((d: { userId?: string; displayName?: string }) => {
        if (d.displayName) setDisplayName(d.displayName)
        else if (d.userId) setDisplayName(d.userId.split('@')[0])
      })
      .catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName }),
    }).catch(() => {})
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={18} style={{ color: '#6366F1' }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{lang === 'pl' ? 'Konto' : 'Account'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lang === 'pl' ? 'Dane profilu' : 'Profile data'}</div>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>{lang === 'pl' ? 'Imię / Pseudonim' : 'Name / Nickname'}</label>
        <input
          style={inputStyle} value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="TrainMate"
          onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
        />
      </div>
      <button style={primaryBtn} onClick={save} disabled={saving}>
        {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : saved ? <Check size={14} /> : null}
        {saved ? (lang === 'pl' ? 'Zapisano!' : 'Saved!') : (lang === 'pl' ? 'Zapisz' : 'Save')}
      </button>
    </div>
  )
}

// ── Password ───────────────────────────────────────────────────────────────────
function PasswordSection() {
  const { lang } = useLang()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) { setError(lang === 'pl' ? 'Hasła nie pasują' : 'Passwords do not match'); return }
    if (next.length < 8) { setError(lang === 'pl' ? 'Min. 8 znaków' : 'Min. 8 characters'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const d = await res.json() as { success?: boolean; error?: string }
      if (!res.ok) setError(d.error ?? 'Error')
      else { setSuccess(true); setCurrent(''); setNext(''); setConfirm(''); setTimeout(() => setSuccess(false), 3000) }
    } catch { setError(lang === 'pl' ? 'Błąd połączenia' : 'Connection error') }
    setSaving(false)
  }

  const fields = lang === 'pl'
    ? [
        { val: current, set: setCurrent, lbl: 'Obecne hasło', ph: '••••••••' },
        { val: next, set: setNext, lbl: 'Nowe hasło', ph: 'min. 8 znaków' },
        { val: confirm, set: setConfirm, lbl: 'Powtórz nowe hasło', ph: '••••••••' },
      ]
    : [
        { val: current, set: setCurrent, lbl: 'Current password', ph: '••••••••' },
        { val: next, set: setNext, lbl: 'New password', ph: 'min. 8 chars' },
        { val: confirm, set: setConfirm, lbl: 'Repeat new password', ph: '••••••••' },
      ]

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(251,191,36,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={18} style={{ color: '#FBBF24' }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{lang === 'pl' ? 'Hasło' : 'Password'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lang === 'pl' ? 'Zmień hasło logowania' : 'Change your login password'}</div>
        </div>
      </div>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fields.map(({ val, set, lbl, ph }) => (
          <div key={lbl}>
            <label style={labelStyle}>{lbl}</label>
            <input type="password" style={inputStyle} value={val} onChange={e => set(e.target.value)} placeholder={ph}
              onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
            />
          </div>
        ))}
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '8px 12px', color: '#EF4444', fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '8px 12px', color: '#22C55E', fontSize: 13 }}>{lang === 'pl' ? 'Hasło zmienione!' : 'Password changed!'}</div>}
        <button type="submit" style={primaryBtn} disabled={saving || !current || !next || !confirm}>
          {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
          {lang === 'pl' ? 'Zmień hasło' : 'Change password'}
        </button>
      </form>
    </div>
  )
}

// ── Integrations ───────────────────────────────────────────────────────────────
function GarminForm({ onSuccess, lang }: { onSuccess: () => void; lang: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/integrations/garmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ garminEmail: email, garminPassword: password }),
      })
      const d = await res.json() as { success?: boolean; error?: string }
      if (!res.ok) setError(d.error ?? 'Error')
      else onSuccess()
    } catch { setError(lang === 'pl' ? 'Błąd połączenia' : 'Connection error') }
    setSaving(false)
  }

  return (
    <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 10 }}>
        {lang === 'pl'
          ? 'Garmin nie udostępnia oficjalnego OAuth. Dane są używane wyłącznie do synkronizacji i przechowywane bezpiecznie.'
          : 'Garmin has no official OAuth. Credentials are used only for sync and stored securely.'}
      </div>
      {[
        { type: 'email', val: email, set: setEmail, lbl: 'Email Garmin Connect', ph: 'twoj@email.com' },
        { type: 'password', val: password, set: setPassword, lbl: lang === 'pl' ? 'Hasło Garmin Connect' : 'Garmin Connect Password', ph: '••••••••' },
      ].map(({ type, val, set, lbl, ph }) => (
        <div key={lbl}>
          <label style={labelStyle}>{lbl}</label>
          <input type={type} style={inputStyle} value={val} onChange={e => set(e.target.value)} placeholder={ph} required
            onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
          />
        </div>
      ))}
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '8px 12px', color: '#EF4444', fontSize: 13 }}>{error}</div>}
      <button type="submit" style={primaryBtn} disabled={saving || !email || !password}>
        {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Check size={14} />}
        {saving ? (lang === 'pl' ? 'Weryfikacja...' : 'Verifying...') : (lang === 'pl' ? 'Połącz Garmin' : 'Connect Garmin')}
      </button>
    </form>
  )
}

function IntegrationsSection() {
  const { lang } = useLang()
  const [garminConnected, setGarminConnected] = useState(false)
  const [garminOpen, setGarminOpen] = useState(false)

  useEffect(() => {
    fetch('/api/integrations/garmin')
      .then(r => r.json())
      .then((d: { connected?: boolean }) => setGarminConnected(!!d.connected))
      .catch(() => {})
  }, [])

  async function disconnectGarmin() {
    await fetch('/api/integrations/garmin', { method: 'DELETE' })
    setGarminConnected(false)
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity size={18} style={{ color: '#22C55E' }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{lang === 'pl' ? 'Integracje' : 'Integrations'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lang === 'pl' ? 'Połącz urządzenia i platformy' : 'Connect devices & platforms'}</div>
        </div>
      </div>

      {/* Garmin */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⌚</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Garmin Connect</span>
              {garminConnected && (
                <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(34,197,94,0.15)', color: '#22C55E', borderRadius: 99, padding: '2px 8px' }}>✓ {lang === 'pl' ? 'Połączone' : 'Connected'}</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>HRV, RHR, {lang === 'pl' ? 'sen, aktywności' : 'sleep, activities'}</div>
          </div>
          {garminConnected ? (
            <button onClick={disconnectGarmin} style={{ ...dangerBtn, padding: '6px 12px', fontSize: 12 }}>
              <Unlink size={12} /> {lang === 'pl' ? 'Odłącz' : 'Disconnect'}
            </button>
          ) : (
            <button onClick={() => setGarminOpen(v => !v)} style={ghostBtn}>
              <LinkIcon size={12} /> {garminOpen ? (lang === 'pl' ? 'Anuluj' : 'Cancel') : (lang === 'pl' ? 'Połącz' : 'Connect')}
            </button>
          )}
        </div>
        {garminOpen && !garminConnected && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <GarminForm lang={lang} onSuccess={() => { setGarminConnected(true); setGarminOpen(false) }} />
          </div>
        )}
      </div>

      {/* Coming soon */}
      {[
        { name: 'Strava', icon: '🚴', desc: lang === 'pl' ? 'Aktywności, trasy, segmenty' : 'Activities, routes, segments' },
        { name: 'Wahoo', icon: '💨', desc: lang === 'pl' ? 'Dane z trenażera i czujników' : 'Trainer and sensor data' },
        { name: 'Polar', icon: '🔵', desc: lang === 'pl' ? 'HRV, puls, treningi' : 'HRV, heart rate, workouts' },
      ].map(({ name, icon, desc }) => (
        <div key={name} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', marginBottom: 8, opacity: 0.55 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{name}</span>
                <span style={{ fontSize: 10, fontWeight: 600, background: 'var(--bg-elevated)', color: 'var(--text-muted)', borderRadius: 99, padding: '2px 8px' }}>{lang === 'pl' ? 'wkrótce' : 'coming soon'}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── TrainPilot ─────────────────────────────────────────────────────────────────
function TrainPilotSection() {
  const { lang } = useLang()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then((d: { userId?: string }) => { if (d.userId) setEmail(d.userId) })
      .catch(() => {})
  }, [])

  const pilotUrl = email
    ? `https://trainpilot.vercel.app/register?email=${encodeURIComponent(email)}`
    : 'https://trainpilot.vercel.app'

  return (
    <div style={{ ...card, background: 'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(129,140,248,0.04))', borderColor: 'rgba(99,102,241,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={18} style={{ color: '#6366F1' }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>TrainPilot</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {lang === 'pl' ? 'Analityka osobista — FTP · CTL/ATL · HRV · AI Briefing' : 'Personal analytics — FTP · CTL/ATL · HRV · AI Briefing'}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {lang === 'pl'
          ? 'Użyj tego samego adresu email na TrainPilot, aby połączyć konta i synchronizować dane treningowe.'
          : 'Use the same email address on TrainPilot to link accounts and sync training data.'}
        {email && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lang === 'pl' ? 'Twój email:' : 'Your email:'}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#6366F1', fontFamily: 'monospace' }}>{email}</span>
          </div>
        )}
      </div>

      <a
        href={pilotUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...primaryBtn, textDecoration: 'none', display: 'inline-flex' }}
      >
        <ExternalLink size={14} />
        {lang === 'pl' ? 'Otwórz TrainPilot' : 'Open TrainPilot'}
      </a>
    </div>
  )
}

// ── Session ────────────────────────────────────────────────────────────────────
function SessionSection() {
  const { lang } = useLang()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div style={{ ...card, borderColor: 'rgba(239,68,68,0.2)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>{lang === 'pl' ? 'SESJA' : 'SESSION'}</div>
      <button onClick={logout} style={{ ...dangerBtn, width: '100%', justifyContent: 'center' }}>
        <LogOut size={15} /> {lang === 'pl' ? 'Wyloguj się' : 'Sign out'}
      </button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { lang } = useLang()

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 100px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5, fontFamily: 'Syne, sans-serif', marginBottom: 4 }}>
          {lang === 'pl' ? 'Ustawienia' : 'Settings'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          {lang === 'pl' ? 'Konto, bezpieczeństwo i integracje' : 'Account, security & integrations'}
        </p>
      </div>

      <p style={sectionTitle}>{lang === 'pl' ? 'PROFIL' : 'PROFILE'}</p>
      <AccountSection />

      <p style={{ ...sectionTitle, marginTop: 20 }}>{lang === 'pl' ? 'BEZPIECZEŃSTWO' : 'SECURITY'}</p>
      <PasswordSection />

      <p style={{ ...sectionTitle, marginTop: 20 }}>{lang === 'pl' ? 'URZĄDZENIA' : 'DEVICES'}</p>
      <IntegrationsSection />

      <p style={{ ...sectionTitle, marginTop: 20 }}>TRAINPILOT</p>
      <TrainPilotSection />

      <p style={{ ...sectionTitle, marginTop: 20 }}>{lang === 'pl' ? 'KONTO' : 'ACCOUNT'}</p>
      <SessionSection />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
