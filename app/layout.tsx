import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TrainingTinder — Find Your Training Partner',
  description: 'Connect with local athletes. Match by sport, pace, and location.',
  keywords: ['training', 'cycling', 'running', 'triathlon', 'athletes', 'fitness'],
};

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const CLERK_CONFIGURED = Boolean(CLERK_KEY && CLERK_KEY.startsWith('pk_') && CLERK_KEY !== 'pk_test_placeholder');

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const inner = (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );

  if (CLERK_CONFIGURED) {
    const { ClerkProvider } = await import('@clerk/nextjs');
    return <ClerkProvider>{inner}</ClerkProvider>;
  }

  return inner;
}
