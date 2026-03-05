import Link from 'next/link';

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const CLERK_CONFIGURED = Boolean(CLERK_KEY && CLERK_KEY.startsWith('pk_') && CLERK_KEY !== 'pk_test_placeholder');

export default async function HomePage() {
  let userId: string | null = null;
  if (CLERK_CONFIGURED) {
    const { auth } = await import('@clerk/nextjs/server');
    const session = await auth();
    userId = session.userId;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h1
          className="font-display"
          style={{
            fontSize: '5rem',
            color: 'var(--text)',
            lineHeight: 1,
            marginBottom: '0.5rem',
          }}
        >
          TRAINING
          <span style={{ color: 'var(--accent)' }}>TINDER</span>
        </h1>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '1.2rem',
            marginBottom: '3rem',
            lineHeight: 1.6,
          }}
        >
          Find your perfect training partner. Match by sport, pace, and location.
          Train harder. Together.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {!userId ? (
            <>
              <Link
                href="/sign-in"
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  padding: '0.875rem 2.5rem',
                  fontWeight: 700,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  display: 'inline-block',
                  transition: 'all 0.2s',
                }}
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                style={{
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '0.875rem 2.5rem',
                  fontWeight: 700,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  display: 'inline-block',
                  transition: 'all 0.2s',
                }}
              >
                Sign Up
              </Link>
            </>
          ) : (
            <Link
              href="/dashboard"
              style={{
                background: 'var(--accent)',
                color: 'white',
                padding: '0.875rem 2.5rem',
                fontWeight: 700,
                fontSize: '1rem',
                textDecoration: 'none',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'inline-block',
              }}
            >
              Go to Dashboard
            </Link>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '2rem',
            justifyContent: 'center',
            marginTop: '4rem',
            flexWrap: 'wrap',
          }}
        >
          {[
            { sport: 'Cycling', color: '#FF4500', emoji: '🚴' },
            { sport: 'Running', color: '#00D4FF', emoji: '🏃' },
            { sport: 'Triathlon', color: '#FFD700', emoji: '🏊' },
            { sport: 'Trail Running', color: '#00CC44', emoji: '🏔️' },
            { sport: 'Gravel', color: '#FF8800', emoji: '🚵' },
            { sport: 'MTB', color: '#44FF88', emoji: '⛰️' },
          ].map((item) => (
            <div
              key={item.sport}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  border: `1px solid ${item.color}33`,
                  background: `${item.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                }}
              >
                {item.emoji}
              </div>
              <span style={{ color: item.color, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em' }}>
                {item.sport.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
