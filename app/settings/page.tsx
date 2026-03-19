'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, LogOut, Check, Loader2, Activity, Unlink, Link as LinkIcon, Zap, ExternalLink, Sun, Moon, Globe, Bell, Shield, Trash2 } from 'lucide-react'
import { useLang } from '@/lib/lang'
import { useTheme } from '@/lib/theme'

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
  const { t } = useLang()
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
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('settings_account')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('settings_profile_data')}</div>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="settings-displayName" style={labelStyle}>{t('settings_display_name')}</label>
        <input
          id="settings-displayName"
          style={inputStyle} value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="TrainMate"
          onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
        />
      </div>
      <button style={primaryBtn} onClick={save} disabled={saving}>
        {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : saved ? <Check size={14} /> : null}
        {saved ? t('settings_saved') : t('settings_save')}
      </button>
    </div>
  )
}

// ── Password ───────────────────────────────────────────────────────────────────
function PasswordSection() {
  const { t } = useLang()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) { setError(t('settings_pw_no_match')); return }
    if (next.length < 8) { setError(t('settings_pw_min_chars')); return }
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
    } catch { setError(t('settings_conn_error')) }
    setSaving(false)
  }

  const fields = [
    { val: current, set: setCurrent, lbl: t('settings_pw_current'), ph: '••••••••' },
    { val: next, set: setNext, lbl: t('settings_pw_new'), ph: t('settings_pw_new_ph') },
    { val: confirm, set: setConfirm, lbl: t('settings_pw_repeat'), ph: '••••••••' },
  ]

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(251,191,36,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={18} style={{ color: '#FBBF24' }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('settings_password')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('settings_password_sub')}</div>
        </div>
      </div>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fields.map(({ val, set, lbl, ph }) => {
          const fieldId = `settings-${lbl.toLowerCase().replace(/\s+/g, '-')}`;
          return (
          <div key={lbl}>
            <label htmlFor={fieldId} style={labelStyle}>{lbl}</label>
            <input id={fieldId} type="password" style={inputStyle} value={val} onChange={e => set(e.target.value)} placeholder={ph}
              onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          );
        })}
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '8px 12px', color: '#EF4444', fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '8px 12px', color: '#22C55E', fontSize: 13 }}>{t('settings_pw_changed')}</div>}
        <button type="submit" style={primaryBtn} disabled={saving || !current || !next || !confirm}>
          {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
          {t('settings_pw_change_btn')}
        </button>
      </form>
    </div>
  )
}

// ── Integrations ───────────────────────────────────────────────────────────────
function GarminForm({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useLang()
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
    } catch { setError(t('settings_conn_error')) }
    setSaving(false)
  }

  return (
    <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 10 }}>
        {t('settings_garmin_oauth_note')}
      </div>
      {[
        { type: 'email', val: email, set: setEmail, lbl: t('settings_garmin_email'), ph: 'twoj@email.com' },
        { type: 'password', val: password, set: setPassword, lbl: t('settings_garmin_password'), ph: '••••••••' },
      ].map(({ type, val, set, lbl, ph }) => {
        const fieldId = `garmin-${lbl.toLowerCase().replace(/\s+/g, '-')}`;
        return (
        <div key={lbl}>
          <label htmlFor={fieldId} style={labelStyle}>{lbl}</label>
          <input id={fieldId} type={type} style={inputStyle} value={val} onChange={e => set(e.target.value)} placeholder={ph} required
            onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
          />
        </div>
        );
      })}
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '8px 12px', color: '#EF4444', fontSize: 13 }}>{error}</div>}
      <button type="submit" style={primaryBtn} disabled={saving || !email || !password}>
        {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Check size={14} />}
        {saving ? t('settings_garmin_verifying') : t('settings_garmin_connect_btn')}
      </button>
    </form>
  )
}

function IntegrationsSection() {
  const { t } = useLang()
  const [garminConnected, setGarminConnected] = useState(false)
  const [garminOpen, setGarminOpen] = useState(false)
  const [stravaConnected, setStravaConnected] = useState(false)
  const [stravaDisconnecting, setStravaDisconnecting] = useState(false)
  const [garminDisconnecting, setGarminDisconnecting] = useState(false)

  useEffect(() => {
    fetch('/api/integrations/garmin')
      .then(r => r.json())
      .then((d: { connected?: boolean }) => setGarminConnected(!!d.connected))
      .catch(() => {})
    fetch('/api/strava/status')
      .then(r => r.json())
      .then((d: { connected?: boolean }) => setStravaConnected(!!d.connected))
      .catch(() => {})
  }, [])

  async function disconnectGarmin() {
    setGarminDisconnecting(true)
    try {
      await fetch('/api/integrations/garmin', { method: 'DELETE' })
      setGarminConnected(false)
    } catch {}
    setGarminDisconnecting(false)
  }

  async function disconnectStrava() {
    setStravaDisconnecting(true)
    try {
      const res = await fetch('/api/strava/disconnect', { method: 'POST' })
      if (res.ok) setStravaConnected(false)
    } catch {}
    setStravaDisconnecting(false)
  }

  function connectStrava() {
    window.location.href = '/api/strava/connect'
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity size={18} style={{ color: '#22C55E' }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('settings_integrations')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('settings_integrations_sub')}</div>
        </div>
      </div>

      {/* Strava */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🚴</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Strava</span>
              {stravaConnected ? (
                <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(34,197,94,0.15)', color: '#22C55E', borderRadius: 99, padding: '2px 8px' }}>✓ {t('settings_strava_connected')}</span>
              ) : (
                <span style={{ fontSize: 10, fontWeight: 600, background: 'var(--bg-elevated)', color: 'var(--text-muted)', borderRadius: 99, padding: '2px 8px' }}>{t('settings_strava_not_connected')}</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('settings_strava_desc')}</div>
          </div>
          {stravaConnected ? (
            <button onClick={disconnectStrava} disabled={stravaDisconnecting} style={{ ...dangerBtn, padding: '6px 12px', fontSize: 12 }}>
              {stravaDisconnecting ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Unlink size={12} />} {t('settings_disconnect')}
            </button>
          ) : (
            <button onClick={connectStrava} style={ghostBtn}>
              <LinkIcon size={12} /> {t('settings_strava_connect_btn')}
            </button>
          )}
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
                <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(34,197,94,0.15)', color: '#22C55E', borderRadius: 99, padding: '2px 8px' }}>✓ {t('settings_garmin_connected')}</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>HRV, RHR, {t('settings_garmin_data')}</div>
          </div>
          {garminConnected ? (
            <button onClick={disconnectGarmin} disabled={garminDisconnecting} style={{ ...dangerBtn, padding: '6px 12px', fontSize: 12 }}>
              {garminDisconnecting ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Unlink size={12} />} {t('settings_disconnect')}
            </button>
          ) : (
            <button onClick={() => setGarminOpen(v => !v)} style={ghostBtn}>
              <LinkIcon size={12} /> {garminOpen ? t('gen_cancel') : t('settings_connect')}
            </button>
          )}
        </div>
        {garminOpen && !garminConnected && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <GarminForm onSuccess={() => { setGarminConnected(true); setGarminOpen(false) }} />
          </div>
        )}
      </div>

      {/* Coming soon */}
      {[
        { name: 'Wahoo', icon: '💨', desc: t('settings_wahoo_desc') },
        { name: 'Polar', icon: '🔵', desc: t('settings_polar_desc') },
      ].map(({ name, icon, desc }) => (
        <div key={name} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', marginBottom: 8, opacity: 0.55 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{name}</span>
                <span style={{ fontSize: 10, fontWeight: 600, background: 'var(--bg-elevated)', color: 'var(--text-muted)', borderRadius: 99, padding: '2px 8px' }}>{t('settings_coming_soon')}</span>
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
  const { t } = useLang()
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
            {t('settings_trainpilot_desc')}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {t('settings_trainpilot_link')}
        {email && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('settings_trainpilot_email')}</span>
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
        {t('settings_trainpilot_open')}
      </a>
    </div>
  )
}

// ── Appearance ──────────────────────────────────────────────────────────────────
function AppearanceSection() {
  const { t } = useLang()
  const { theme, setTheme } = useTheme()

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(129,140,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {theme === 'dark' ? <Moon size={18} style={{ color: '#818CF8' }} /> : <Sun size={18} style={{ color: '#818CF8' }} />}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('settings_appearance')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('settings_appearance_sub')}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setTheme('dark')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: theme === 'dark' ? '2px solid #6366F1' : '1px solid var(--border)',
            background: theme === 'dark' ? 'rgba(99,102,241,0.1)' : 'var(--bg-elevated)',
            color: theme === 'dark' ? '#6366F1' : 'var(--text-muted)',
          }}
        >
          <Moon size={15} /> {t('settings_theme_dark')}
        </button>
        <button
          onClick={() => setTheme('light')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: theme === 'light' ? '2px solid #6366F1' : '1px solid var(--border)',
            background: theme === 'light' ? 'rgba(99,102,241,0.1)' : 'var(--bg-elevated)',
            color: theme === 'light' ? '#6366F1' : 'var(--text-muted)',
          }}
        >
          <Sun size={15} /> {t('settings_theme_light')}
        </button>
      </div>
    </div>
  )
}

// ── Language ─────────────────────────────────────────────────────────────────────
function LanguageSection() {
  const { t, lang, setLang } = useLang()

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Globe size={18} style={{ color: '#38BDF8' }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('settings_language')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('settings_language_sub')}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setLang('pl')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: lang === 'pl' ? '2px solid #6366F1' : '1px solid var(--border)',
            background: lang === 'pl' ? 'rgba(99,102,241,0.1)' : 'var(--bg-elevated)',
            color: lang === 'pl' ? '#6366F1' : 'var(--text-muted)',
          }}
        >
          PL — Polski
        </button>
        <button
          onClick={() => setLang('en')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: lang === 'en' ? '2px solid #6366F1' : '1px solid var(--border)',
            background: lang === 'en' ? 'rgba(99,102,241,0.1)' : 'var(--bg-elevated)',
            color: lang === 'en' ? '#6366F1' : 'var(--text-muted)',
          }}
        >
          EN — English
        </button>
      </div>
    </div>
  )
}

// ── Notifications ───────────────────────────────────────────────────────────────
function NotificationsSection() {
  const { t } = useLang()
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    if (!('Notification' in window)) return false
    return Notification.permission === 'granted' && !!localStorage.getItem('push-registered')
  })
  const [denied, setDenied] = useState(() => {
    if (typeof window === 'undefined') return false
    if (!('Notification' in window)) return false
    return Notification.permission === 'denied'
  })
  const [supported] = useState(() => {
    if (typeof window === 'undefined') return true
    return 'Notification' in window && 'serviceWorker' in navigator
  })
  const [loading, setLoading] = useState(false)

  async function togglePush() {
    if (enabled) {
      setEnabled(false)
      localStorage.removeItem('push-registered')
      return
    }
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm === 'denied') { setDenied(true); setLoading(false); return }
      if (perm !== 'granted') { setLoading(false); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      })
      localStorage.setItem('push-registered', '1')
      setEnabled(true)
    } catch {}
    setLoading(false)
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(251,146,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={18} style={{ color: '#FB923C' }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('settings_notifications')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('settings_notifications_sub')}</div>
        </div>
      </div>
      {!supported ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: 10, padding: '10px 14px' }}>
          {t('settings_notifications_unsupported')}
        </div>
      ) : denied ? (
        <div style={{ fontSize: 13, color: '#EF4444', background: 'rgba(239,68,68,0.08)', borderRadius: 10, padding: '10px 14px' }}>
          {t('settings_notifications_denied')}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, color: 'var(--text)' }}>
            {enabled ? t('settings_notifications_enabled') : t('settings_notifications_enable')}
          </span>
          <button
            onClick={togglePush}
            disabled={loading}
            aria-label={enabled ? t('settings_notifications_enabled') : t('settings_notifications_enable')}
            style={{
              position: 'relative', width: 48, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer',
              background: enabled ? '#6366F1' : 'var(--bg-elevated)',
              boxShadow: enabled ? '0 2px 8px rgba(99,102,241,0.3)' : 'inset 0 1px 3px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: enabled ? 23 : 3,
              width: 22, height: 22, borderRadius: '50%', background: 'white',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transition: 'left 0.2s',
            }} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Privacy ─────────────────────────────────────────────────────────────────────
function PrivacySection() {
  const { t } = useLang()
  const [visibility, setVisibility] = useState('everyone')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/users/profile')
      .then(r => r.json())
      .then((d: { profileVisibility?: string }) => {
        if (d.profileVisibility) setVisibility(d.profileVisibility)
      })
      .catch(() => {})
  }, [])

  async function saveVisibility(val: string) {
    setVisibility(val)
    setSaving(true)
    try {
      await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileVisibility: val }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  const options = [
    { value: 'everyone', label: t('settings_privacy_everyone') },
    { value: 'friends', label: t('settings_privacy_friends') },
    { value: 'nobody', label: t('settings_privacy_nobody') },
  ]

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={18} style={{ color: '#22C55E' }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('settings_privacy')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('settings_privacy_sub')}</div>
        </div>
      </div>
      <div>
        <label htmlFor="settings-visibility" style={labelStyle}>{t('settings_privacy_who_sees')}</label>
        <div style={{ position: 'relative' }}>
          <select
            id="settings-visibility"
            value={visibility}
            onChange={e => saveVisibility(e.target.value)}
            disabled={saving}
            style={{
              ...inputStyle,
              appearance: 'none',
              paddingRight: 36,
              cursor: 'pointer',
            }}
          >
            {options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 12 }}>
            ▼
          </div>
        </div>
        {saved && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#22C55E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Check size={12} /> {t('settings_privacy_saved')}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Delete Account ──────────────────────────────────────────────────────────────
function DeleteAccountSection() {
  const { t } = useLang()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    const confirmed = window.confirm(t('settings_delete_confirm'))
    if (!confirmed) return
    setDeleting(true)
    try {
      await fetch('/api/users/profile', { method: 'DELETE' })
      router.push('/')
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div style={{ ...card, borderColor: 'rgba(239,68,68,0.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trash2 size={18} style={{ color: '#EF4444' }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('settings_delete_account')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('settings_delete_account_sub')}</div>
        </div>
      </div>
      <button onClick={handleDelete} disabled={deleting} style={{ ...dangerBtn, width: '100%', justifyContent: 'center' }}>
        {deleting ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Trash2 size={15} />}
        {t('settings_delete_account_btn')}
      </button>
    </div>
  )
}

// ── Session ────────────────────────────────────────────────────────────────────
function SessionSection() {
  const { t } = useLang()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div style={{ ...card, borderColor: 'rgba(239,68,68,0.2)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>{t('settings_session')}</div>
      <button onClick={logout} style={{ ...dangerBtn, width: '100%', justifyContent: 'center' }}>
        <LogOut size={15} /> {t('settings_signout')}
      </button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { t } = useLang()

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 100px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5, fontFamily: 'Syne, sans-serif', marginBottom: 4 }}>
          {t('settings_title')}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          {t('settings_subtitle')}
        </p>
      </div>

      <p style={sectionTitle}>{t('settings_section_profile')}</p>
      <AccountSection />

      <p style={{ ...sectionTitle, marginTop: 20 }}>{t('settings_section_security')}</p>
      <PasswordSection />

      <p style={{ ...sectionTitle, marginTop: 20 }}>{t('settings_section_appearance')}</p>
      <AppearanceSection />

      <p style={{ ...sectionTitle, marginTop: 20 }}>{t('settings_section_language')}</p>
      <LanguageSection />

      <p style={{ ...sectionTitle, marginTop: 20 }}>{t('settings_section_notifications')}</p>
      <NotificationsSection />

      <p style={{ ...sectionTitle, marginTop: 20 }}>{t('settings_section_privacy')}</p>
      <PrivacySection />

      <p style={{ ...sectionTitle, marginTop: 20 }}>{t('settings_section_devices')}</p>
      <IntegrationsSection />

      <p style={{ ...sectionTitle, marginTop: 20 }}>{t('settings_trainpilot_section')}</p>
      <TrainPilotSection />

      <p style={{ ...sectionTitle, marginTop: 20 }}>{t('settings_section_account')}</p>
      <SessionSection />

      <p style={{ ...sectionTitle, marginTop: 20 }}>{t('settings_section_danger')}</p>
      <DeleteAccountSection />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
