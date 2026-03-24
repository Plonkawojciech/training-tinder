'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { useLang } from '@/lib/lang';

export default function LoginPage() {
  const { t } = useLang();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (mode === 'register' && password !== confirmPassword) {
      setError(t('login_passwords_mismatch'));
      return;
    }
    if (mode === 'register' && password.length < 8) {
      setError(t('login_password_too_short'));
      return;
    }
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
      const data = await res.json() as { success?: boolean; error?: string | { code: string; message: string } };
      if (res.ok && data.success) {
        router.push('/dashboard');
      } else {
        const errMsg = typeof data.error === 'object' && data.error?.message ? data.error.message : (typeof data.error === 'string' ? data.error : t('login_generic_error'));
        setError(errMsg);
      }
    } catch {
      setError(t('login_connection_error'));
    } finally {
      setLoading(false);
    }
  }

  const isDisabled = loading || !email.trim() || !password;

  return (
    <>
      <style>{`
        .lp {
          min-height: 100dvh;
          background: #050508;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* Grid overlay */
        .lp-grid {
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(249,115,22,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249,115,22,0.04) 1px, transparent 1px);
          background-size: 80px 80px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 0%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* Gradient orbs */
        .lp-orb1 {
          position: fixed;
          top: -20%;
          right: -10%;
          width: 900px;
          height: 900px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.04) 40%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .lp-orb2 {
          position: fixed;
          bottom: -25%;
          left: -15%;
          width: 700px;
          height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* Top bar */
        .lp-topbar {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px 32px;
        }
        .lp-back {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          transition: all 0.2s;
        }
        .lp-back:hover {
          background: rgba(255,255,255,0.08);
          color: #FAFAFA;
        }
        .lp-topbar-brand {
          font-family: 'Syne', 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #FAFAFA;
          letter-spacing: -0.01em;
        }
        .lp-topbar-brand span {
          color: #F97316;
        }

        /* Main card container */
        .lp-main {
          position: relative;
          z-index: 10;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 32px 32px;
        }
        .lp-card {
          width: 100%;
          max-width: 960px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: rgba(12,12,15,0.82);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px;
          box-shadow: 0 40px 120px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02) inset;
          overflow: hidden;
          animation: cardIn 0.5s ease both;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Left panel — marketing */
        .lp-left {
          padding: 48px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: linear-gradient(160deg, rgba(249,115,22,0.06) 0%, transparent 60%);
          border-right: 1px solid rgba(255,255,255,0.04);
          order: 0;
        }
        .lp-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 100px;
          background: rgba(249,115,22,0.08);
          border: 1px solid rgba(249,115,22,0.15);
          font-size: 12px;
          font-weight: 600;
          color: #FB923C;
          letter-spacing: 0.02em;
          width: fit-content;
          margin-bottom: 28px;
        }
        .lp-pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #F97316;
        }
        .lp-hero-title {
          font-family: 'Syne', 'Inter', sans-serif;
          font-size: 38px;
          font-weight: 800;
          color: #FAFAFA;
          letter-spacing: -0.03em;
          line-height: 1.15;
          margin-bottom: 16px;
        }
        .lp-hero-sub {
          font-size: 15px;
          color: rgba(255,255,255,0.4);
          line-height: 1.65;
          margin-bottom: 32px;
          max-width: 360px;
        }

        /* Bento feature cards */
        .lp-bentos {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 36px;
        }
        .lp-bento {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px;
          border-radius: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          transition: border-color 0.2s;
        }
        .lp-bento:hover {
          border-color: rgba(249,115,22,0.2);
        }
        .lp-bento-icon {
          font-size: 22px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .lp-bento-title {
          font-size: 14px;
          font-weight: 700;
          color: #FAFAFA;
          margin-bottom: 4px;
        }
        .lp-bento-desc {
          font-size: 13px;
          color: rgba(255,255,255,0.35);
          line-height: 1.5;
        }

        /* Left footer */
        .lp-left-footer {
          font-size: 12px;
          color: rgba(255,255,255,0.18);
          letter-spacing: 0.02em;
        }
        .lp-left-footer a {
          color: rgba(249,115,22,0.45);
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s;
        }
        .lp-left-footer a:hover {
          color: rgba(249,115,22,0.75);
        }

        /* Right panel — form */
        .lp-right {
          padding: 48px 44px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          order: 1;
        }
        .lp-form-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(249,115,22,0.65);
          margin-bottom: 12px;
        }
        .lp-form-title {
          font-family: 'Syne', 'Inter', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: #FAFAFA;
          letter-spacing: -0.03em;
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .lp-form-subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          margin-bottom: 28px;
          line-height: 1.5;
        }

        /* Tabs */
        .lp-tabs {
          display: flex;
          background: rgba(255,255,255,0.04);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 28px;
          gap: 4px;
        }
        .lp-tab {
          flex: 1;
          padding: 10px;
          border-radius: 9px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.25s ease;
          letter-spacing: 0.01em;
        }
        .lp-tab-active {
          background: linear-gradient(135deg, #F97316, #FB923C);
          color: white;
          box-shadow: 0 2px 12px rgba(249,115,22,0.35);
        }
        .lp-tab-inactive {
          background: transparent;
          color: rgba(255,255,255,0.35);
        }
        .lp-tab-inactive:hover {
          color: rgba(255,255,255,0.6);
        }

        /* Form */
        .lp-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .lp-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .lp-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          padding-left: 2px;
        }
        .lp-input-wrap {
          position: relative;
        }
        .lp-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 14px 16px;
          color: #FAFAFA;
          font-size: 15px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .lp-input::placeholder {
          color: rgba(255,255,255,0.2);
        }
        .lp-input:focus {
          border-color: rgba(249,115,22,0.6);
          box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
        }
        .lp-input-pw {
          padding-right: 48px;
        }
        .lp-pw-toggle {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px 10px;
          color: rgba(255,255,255,0.3);
          transition: color 0.2s;
          min-height: 44px;
          display: flex;
          align-items: center;
        }
        .lp-pw-toggle:hover {
          color: rgba(255,255,255,0.6);
        }

        /* Error */
        .lp-error {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.15);
          color: #FCA5A5;
          font-size: 13px;
          line-height: 1.4;
        }

        /* Submit */
        .lp-submit {
          width: 100%;
          border: none;
          border-radius: 12px;
          padding: 16px;
          color: white;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.01em;
          transition: all 0.25s ease;
          margin-top: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .lp-submit-active {
          background: linear-gradient(135deg, #F97316 0%, #FB923C 100%);
          cursor: pointer;
          box-shadow: 0 8px 28px rgba(249,115,22,0.35);
        }
        .lp-submit-active:hover {
          box-shadow: 0 12px 40px rgba(249,115,22,0.45);
          transform: translateY(-2px);
        }
        .lp-submit-disabled {
          background: rgba(249,115,22,0.2);
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Mode switcher */
        .lp-mode-switch {
          text-align: center;
          margin-top: 24px;
          font-size: 13px;
          color: rgba(255,255,255,0.35);
        }
        .lp-mode-switch button {
          background: none;
          border: none;
          color: #FB923C;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
          transition: color 0.2s;
          padding: 0;
        }
        .lp-mode-switch button:hover {
          color: #F97316;
        }

        /* Ecosystem */
        .lp-eco {
          text-align: center;
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .lp-eco-text {
          font-size: 12px;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.02em;
        }
        .lp-eco-link {
          color: rgba(249,115,22,0.5);
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s;
        }
        .lp-eco-link:hover {
          color: rgba(249,115,22,0.8);
        }

        /* Spinner */
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .lp-spinner {
          animation: spin 0.8s linear infinite;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .lp-topbar {
            padding: 20px 20px;
          }
          .lp-main {
            padding: 0 16px 24px;
            align-items: flex-start;
          }
          .lp-card {
            grid-template-columns: 1fr;
            max-width: 480px;
          }
          .lp-left {
            order: 2;
            border-right: none;
            border-top: 1px solid rgba(255,255,255,0.04);
            padding: 32px 28px;
          }
          .lp-right {
            order: 1;
            padding: 36px 28px;
          }
          .lp-hero-title {
            font-size: 28px;
          }
          .lp-hero-sub {
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .lp-right {
            padding: 32px 22px;
          }
          .lp-left {
            padding: 28px 22px;
          }
          .lp-form-title {
            font-size: 24px;
          }
          .lp-hero-title {
            font-size: 24px;
          }
        }
      `}</style>

      <div className="lp">
        <div className="lp-grid" />
        <div className="lp-orb1" />
        <div className="lp-orb2" />

        {/* Top bar */}
        <div className="lp-topbar">
          <Link href="/" className="lp-back" aria-label={t('login_back_aria')}>
            <ArrowLeft size={18} />
          </Link>
          <div className="lp-topbar-brand">
            <span>Athlix</span> TrainMate
          </div>
        </div>

        {/* Main split card */}
        <div className="lp-main">
          <div className="lp-card">

            {/* Left — Marketing panel */}
            <div className="lp-left">
              <div className="lp-pill">
                <span className="lp-pill-dot" />
                Athlete Social Platform
              </div>

              <h1 className="lp-hero-title">
                Znajdź.<br />
                Trenuj.<br />
                Rywalizuj.
              </h1>

              <p className="lp-hero-sub">
                TrainMate łączy sportowców. Swipuj partnerów, organizuj sesje grupowe i wspinaj się w rankingach.
              </p>

              <div className="lp-bentos">
                <div className="lp-bento">
                  <span className="lp-bento-icon">🔍</span>
                  <div>
                    <div className="lp-bento-title">Swipe Discovery</div>
                    <div className="lp-bento-desc">Znajdź partnera do treningu — kolarze, biegacze, triathloniści</div>
                  </div>
                </div>
                <div className="lp-bento">
                  <span className="lp-bento-icon">💬</span>
                  <div>
                    <div className="lp-bento-title">Real-time Chat</div>
                    <div className="lp-bento-desc">Organizuj sesje, planuj trasy, dyskutuj wyniki — na żywo</div>
                  </div>
                </div>
              </div>

              <div className="lp-left-footer">
                <a href="https://athlix-trainpilot.vercel.app" target="_blank" rel="noopener noreferrer">TrainPilot</a>
                {' · '}
                <a href="https://athlix-health.vercel.app" target="_blank" rel="noopener noreferrer">TrainHealth</a>
              </div>
            </div>

            {/* Right — Form panel */}
            <div className="lp-right">
              <div className="lp-form-badge">Witaj w TrainMate</div>
              <h2 className="lp-form-title">
                {mode === 'login' ? 'Zaloguj się' : 'Utwórz konto'}
              </h2>
              <p className="lp-form-subtitle">{t('login_subtitle')}</p>

              {/* Tab switcher */}
              <div className="lp-tabs">
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError(''); }}
                    className={`lp-tab ${mode === m ? 'lp-tab-active' : 'lp-tab-inactive'}`}
                  >
                    {m === 'login' ? t('login_tab_login') : t('login_tab_register')}
                  </button>
                ))}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="lp-form">
                {mode === 'register' && (
                  <div className="lp-field">
                    <label htmlFor="displayName" className="lp-label">{t('login_display_name')}</label>
                    <input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t('login_display_name')}
                      className="lp-input"
                    />
                  </div>
                )}

                <div className="lp-field">
                  <label htmlFor="email" className="lp-label">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                    className="lp-input"
                  />
                </div>

                <div className="lp-field">
                  <label htmlFor="password" className="lp-label">{t('login_password')}</label>
                  <div className="lp-input-wrap">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'register' ? t('login_password_register') : t('login_password')}
                      required
                      className="lp-input lp-input-pw"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="lp-pw-toggle"
                      aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div className="lp-field">
                    <label htmlFor="confirmPassword" className="lp-label">{t('login_confirm_password')}</label>
                    <div className="lp-input-wrap">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t('login_confirm_password')}
                        required
                        className="lp-input lp-input-pw"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="lp-pw-toggle"
                        aria-label={showConfirmPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="lp-error">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={isDisabled}
                  className={`lp-submit ${isDisabled ? 'lp-submit-disabled' : 'lp-submit-active'}`}
                >
                  {loading && <Loader2 size={18} className="lp-spinner" />}
                  {loading
                    ? (mode === 'login' ? t('login_logging_in') : t('login_registering'))
                    : (mode === 'login' ? t('login_submit_login') : t('login_submit_register'))
                  }
                </button>
              </form>

              {/* Mode switcher */}
              <div className="lp-mode-switch">
                {mode === 'login' ? (
                  <>
                    {'Nie masz konta? '}
                    <button onClick={() => { setMode('register'); setError(''); }}>Zarejestruj się</button>
                  </>
                ) : (
                  <>
                    {'Masz już konto? '}
                    <button onClick={() => { setMode('login'); setError(''); }}>Zaloguj się</button>
                  </>
                )}
              </div>

              {/* Ecosystem */}
              <div className="lp-eco">
                <span className="lp-eco-text">
                  {'Część ekosystemu Athlix · '}
                  <a href="https://athlix-trainpilot.vercel.app" target="_blank" rel="noopener noreferrer" className="lp-eco-link">TrainPilot</a>
                  {' · '}
                  <a href="https://athlix-health.vercel.app" target="_blank" rel="noopener noreferrer" className="lp-eco-link">TrainHealth</a>
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
