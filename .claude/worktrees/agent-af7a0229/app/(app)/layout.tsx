import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { PwaInstallButton } from '@/components/pwa-install-button';
import { PushRegistrar } from '@/components/push-registrar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex overflow-hidden" style={{ height: '100dvh', background: 'var(--bg)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <div className="hidden md:block shrink-0">
          <Header />
        </div>
        {/* flex-1 + overflow-y-auto gives scrolling; h-full chain works for pages that need it */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <MobileBottomNav />
      <PwaInstallButton />
      <PushRegistrar />
    </div>
  );
}
