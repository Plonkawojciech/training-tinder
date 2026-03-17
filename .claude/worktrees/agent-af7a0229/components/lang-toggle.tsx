'use client';

import { useLang } from '@/lib/lang';

export function LangToggle({ compact }: { compact?: boolean }) {
  const { lang, setLang } = useLang();

  return (
    <button
      onClick={() => setLang(lang === 'pl' ? 'en' : 'pl')}
      title={lang === 'pl' ? 'Switch to English' : 'Przełącz na Polski'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 0 : 6,
        padding: compact ? '4px 8px' : '5px 10px',
        borderRadius: 99,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,58,237,0.5)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
    >
      <span style={{
        fontSize: 13,
        fontWeight: 700,
        color: lang === 'pl' ? '#7C3AED' : '#888',
        letterSpacing: '0.04em',
        lineHeight: 1,
      }}>PL</span>
      {!compact && (
        <span style={{ color: '#333', fontSize: 11 }}>|</span>
      )}
      <span style={{
        fontSize: 13,
        fontWeight: 700,
        color: lang === 'en' ? '#7C3AED' : '#888',
        letterSpacing: '0.04em',
        lineHeight: 1,
        marginLeft: compact ? 2 : 0,
      }}>EN</span>
    </button>
  );
}
