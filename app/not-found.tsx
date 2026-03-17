import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg, #09090B)',
        color: 'var(--text, #FAFAFA)',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      {/* Large 404 */}
      <div
        style={{
          fontFamily: 'Syne, Inter, sans-serif',
          fontSize: 120,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.04em',
          background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 50%, #A78BFA 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 16,
        }}
      >
        404
      </div>

      <h1
        style={{
          fontFamily: 'Syne, Inter, sans-serif',
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 8,
          letterSpacing: '-0.02em',
        }}
      >
        Strona nie istnieje
      </h1>

      <p
        style={{
          color: 'var(--text-muted, #A1A1AA)',
          fontSize: 15,
          maxWidth: 360,
          lineHeight: 1.6,
          marginBottom: 32,
        }}
      >
        Nie znaleziono strony, której szukasz. Mogła zostać usunięta lub adres jest nieprawidłowy.
      </p>

      <Link
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 28px',
          background: '#6366F1',
          color: 'white',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 700,
          textDecoration: 'none',
          transition: 'box-shadow 0.2s',
          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
        }}
      >
        Wróć na stronę główną
      </Link>
    </div>
  );
}
