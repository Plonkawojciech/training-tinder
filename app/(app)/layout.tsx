import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { PwaInstallButton } from '@/components/pwa-install-button';
import { PushRegistrar } from '@/components/push-registrar';
import { ErrorBoundary } from '@/components/error-boundary';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex"
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:p-2 focus:bg-white focus:text-black focus:rounded"
      >
        Przejdź do treści
      </a>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0" style={{ minHeight: '100dvh' }}>
        <div className="hidden md:block shrink-0">
          <Header />
        </div>
        <main
          id="main-content"
          className="flex-1 overflow-x-hidden"
          style={{ paddingBottom: 'var(--page-pb)' }}
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
      <MobileBottomNav />
      <PwaInstallButton />
      <PushRegistrar />
    </div>
  );
}
