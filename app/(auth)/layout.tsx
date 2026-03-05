import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
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
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div
          style={{
            width: '36px',
            height: '36px',
            background: '#FF4500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            clipPath: 'polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)',
          }}
        >
          <Zap style={{ width: '18px', height: '18px', color: 'white', fill: 'white' }} />
        </div>
        <span className="font-display text-2xl text-white tracking-wider">
          TRAINING<span style={{ color: '#FF4500' }}>TINDER</span>
        </span>
      </Link>

      {children}
    </div>
  );
}
