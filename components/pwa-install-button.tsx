'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { useLang } from '@/lib/lang';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);
}

export function PwaInstallButton() {
  const { t } = useLang();
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isInStandaloneMode());
  const [dismissed, setDismissed] = useState(() => {
    try { return !!localStorage.getItem('pwa-install-dismissed'); } catch { return false; }
  });
  const [showBanner, setShowBanner] = useState(false);
  const [isIosDevice] = useState(() => isIos());

  useEffect(() => {
    if (installed || dismissed) return;

    if (isIosDevice) {
      // iOS: show manual instructions banner after 3s
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));

    return () => { window.removeEventListener('beforeinstallprompt', handler); };
  }, [installed, dismissed, isIosDevice]);

  async function handleInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      setShowBanner(false);
    }
    setPrompt(null);
  }

  function handleDismiss() {
    setShowBanner(false);
    setDismissed(true);
    try { localStorage.setItem('pwa-install-dismissed', '1'); } catch {}
  }

  if (installed || dismissed || !showBanner) return null;
  if (!isIosDevice && !prompt) return null;

  const BANNER_STYLE: React.CSSProperties = {
    position: 'fixed',
    bottom: 80,
    left: 12,
    right: 12,
    zIndex: 60,
    background: 'rgba(18,18,18,0.98)',
    border: '1px solid rgba(99,102,241,0.35)',
    borderRadius: 18,
    padding: '16px 18px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
    backdropFilter: 'blur(20px)',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
  };

  return (
    <div style={BANNER_STYLE}>
      <style>{`@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      <div style={{
        width: 44, height: 44, borderRadius: 20, flexShrink: 0,
        background: 'linear-gradient(135deg, #6366F1, #818CF8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
      }}>
        <Smartphone style={{ width: 22, height: 22, color: 'white' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'white', fontWeight: 700, fontSize: 14, marginBottom: 3 }}>
          {t('pwa_add_home')}
        </div>
        {isIosDevice ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.4 }}>
            {t('pwa_ios_hint')} <span style={{ color: 'white' }}>□↑</span> → <em>{t('pwa_add_home')}</em>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('pwa_native_like')}</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={handleDismiss} style={{
          width: 32, height: 32, borderRadius: 99,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} aria-label={t('pwa_close')}>
          <X style={{ width: 14, height: 14 }} />
        </button>

        {!isIosDevice && (
          <button onClick={handleInstall} style={{
            height: 32, paddingInline: 14, borderRadius: 99,
            background: 'linear-gradient(135deg, #6366F1, #818CF8)',
            border: 'none', color: 'white', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
          }}>
            <Download style={{ width: 12, height: 12 }} />
            {t('pwa_install')}
          </button>
        )}
      </div>
    </div>
  );
}

// Standalone install button for use in profile/settings
export function PwaInstallButtonInline() {
  const { t } = useLang();
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches
  );

  useEffect(() => {
    if (installed) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [installed]);

  async function handleInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setPrompt(null);
  }

  if (installed) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', borderRadius: 20,
        background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.3)',
        color: '#00E676', fontSize: 13, fontWeight: 600,
      }}>
        <Smartphone style={{ width: 16, height: 16 }} />
        {t('pwa_installed')}
      </div>
    );
  }

  if (!prompt) {
    // iOS / unsupported — show manual instructions
    return (
      <div style={{
        padding: '12px 16px', borderRadius: 20,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'white', fontWeight: 600 }}>
          <Smartphone style={{ width: 14, height: 14, color: '#6366F1' }} />
          {t('pwa_add_home')}
        </div>
        <p>{t('pwa_ios_safari')} <strong>□↑</strong> → <em>{t('pwa_add_home')}</em></p>
        <p>{t('pwa_android_chrome')} <em>{t('pwa_add_home')}</em></p>
      </div>
    );
  }

  return (
    <button
      onClick={handleInstall}
      style={{
        width: '100%', padding: '13px', borderRadius: 14,
        background: 'linear-gradient(135deg, #6366F1, #818CF8)',
        border: 'none', color: 'white', fontSize: 14, fontWeight: 700,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: '0 6px 20px rgba(99,102,241,0.35)',
      }}
    >
      <Download style={{ width: 18, height: 18 }} />
      {t('pwa_install_app')}
    </button>
  );
}
