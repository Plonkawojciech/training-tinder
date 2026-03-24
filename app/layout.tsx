import type { Metadata, Viewport } from 'next';
import { Inter, Syne } from 'next/font/google';
import { LangProvider } from '@/lib/lang';
import { ThemeProvider } from '@/lib/theme';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F97316',
};

export const metadata: Metadata = {
  title: 'Athlix TrainMate — Find Your Training Partner',
  description: 'Znajdź partnera do treningu. Swipuj. Trenuj. Rywalizuj.',
  keywords: ['training', 'cycling', 'running', 'triathlon', 'athletes', 'fitness'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TrainMate',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className={`${inter.variable} ${syne.variable}`}>
      <head>
        {/* PWA / iOS */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#F97316" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TrainMate" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="TrainMate" />
      </head>
      <body className="antialiased">
        <a
          href="#main-content"
          className="skip-to-content"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <LangProvider>
            <main id="main-content">
              {children}
            </main>
          </LangProvider>
        </ThemeProvider>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `}} />
      </body>
    </html>
  );
}
