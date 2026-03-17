import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Orange glow top-right */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse 50% 60% at 70% 20%, rgba(124,58,237,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Left decorative panel (desktop) */}
      <div style={{
        display: 'none',
        flex: '0 0 45%',
        padding: '60px 48px',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRight: '1px solid rgba(124,58,237,0.1)',
        position: 'relative',
      }}
        className="auth-left-panel"
      >
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', letterSpacing: '0.06em', color: 'white' }}>
            Training<span style={{ color: '#7C3AED' }}>Tinder</span>
          </span>
        </Link>

        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: '#7C3AED', marginBottom: '24px',
          }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#7C3AED',
              boxShadow: '0 0 8px rgba(124,58,237,0.8)',
              display: 'inline-block',
            }} />
            Live sessions happening now
          </div>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(64px, 7vw, 96px)',
            lineHeight: 0.9,
            letterSpacing: '0.02em',
            marginBottom: '24px',
            color: 'white',
          }}>
            FIND<br />YOUR<br /><span style={{ color: '#7C3AED' }}>PACK.</span>
          </h1>
          <p style={{
            fontSize: '16px', fontWeight: 300,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.7, maxWidth: '360px',
          }}>
            Match with local athletes by sport, pace, and level. Real people. Real accountability.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '40px' }}>
          {[
            { n: '4,200', l: 'Athletes' },
            { n: '89', l: 'Cities' },
            { n: '98%', l: 'Show Rate' },
          ].map((s) => (
            <div key={s.l}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '36px', color: '#7C3AED', lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: auth form */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Mobile logo */}
        <Link href="/" style={{ textDecoration: 'none', marginBottom: '2rem' }} className="auth-mobile-logo">
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', letterSpacing: '0.06em', color: 'white' }}>
            Training<span style={{ color: '#7C3AED' }}>Tinder</span>
          </span>
        </Link>

        {children}

        <p style={{ marginTop: '2rem', fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
          By continuing, you agree to our{' '}
          <a href="#" style={{ color: 'rgba(124,58,237,0.7)', textDecoration: 'none' }}>Terms</a>
          {' & '}
          <a href="#" style={{ color: 'rgba(124,58,237,0.7)', textDecoration: 'none' }}>Privacy Policy</a>
        </p>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .auth-left-panel { display: flex !important; }
          .auth-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}
