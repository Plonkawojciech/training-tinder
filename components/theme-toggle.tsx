'use client';
import { useTheme } from '@/lib/theme';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        display: 'flex', alignItems: 'center', gap: compact ? 0 : 6,
        padding: compact ? '4px 8px' : '5px 10px',
        borderRadius: 99,
        background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
        color: theme === 'dark' ? '#888' : '#555',
      }}
    >
      {theme === 'dark'
        ? <Sun style={{ width: 14, height: 14, color: '#818CF8' }} />
        : <Moon style={{ width: 14, height: 14, color: '#6366F1' }} />
      }
      {!compact && (
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', marginLeft: 4 }}>
          {theme === 'dark' ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}
