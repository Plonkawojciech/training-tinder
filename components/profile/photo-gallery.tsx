'use client';

import { useState, useRef } from 'react';
import { X, ImagePlus, Loader2 } from 'lucide-react';
import { useLang } from '@/lib/lang';

interface PhotoGalleryProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
}

export function PhotoGallery({ photos, onPhotosChange }: PhotoGalleryProps) {
  const { t } = useLang();
  const [uploading, setUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      const res = await fetch('/api/upload/photos', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json() as { urls: string[] };
        onPhotosChange([...photos, ...data.urls]);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete(url: string) {
    setDeletingUrl(url);
    try {
      await fetch('/api/upload/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      onPhotosChange(photos.filter((p) => p !== url));
    } finally {
      setDeletingUrl(null);
    }
  }

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="photo"
            style={{
              maxWidth: '92vw', maxHeight: '88vh',
              objectFit: 'contain', borderRadius: 20,
              boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: 'none', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
      )}

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 8,
      }}>
        {photos.map((url) => (
          <div
            key={url}
            style={{
              position: 'relative', aspectRatio: '1',
              borderRadius: 18, overflow: 'hidden',
              background: '#1A1A1A',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                cursor: 'zoom-in', display: 'block',
              }}
              onClick={() => setLightbox(url)}
            />
            <button
              onClick={() => handleDelete(url)}
              disabled={deletingUrl === url}
              aria-label={t('gen_delete')}
              style={{
                position: 'absolute', top: 4, right: 4,
                width: 24, height: 24, borderRadius: '50%',
                background: 'rgba(0,0,0,0.7)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white',
              }}
            >
              {deletingUrl === url
                ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
                : <X style={{ width: 12, height: 12 }} />
              }
            </button>
          </div>
        ))}

        {/* Add button */}
        {photos.length < 20 && (
          <label
            aria-label={t('photo_add')}
            style={{
              aspectRatio: '1',
              borderRadius: 18,
              border: '2px dashed rgba(255,255,255,0.12)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 6, cursor: uploading ? 'not-allowed' : 'pointer',
              background: 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s',
              color: '#555',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLLabelElement).style.borderColor = 'rgba(99,102,241,0.4)';
              (e.currentTarget as HTMLLabelElement).style.color = '#818CF8';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLLabelElement).style.borderColor = 'rgba(255,255,255,0.12)';
              (e.currentTarget as HTMLLabelElement).style.color = '#555';
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            {uploading
              ? <Loader2 style={{ width: 22, height: 22, animation: 'spin 1s linear infinite' }} />
              : <><ImagePlus style={{ width: 22, height: 22 }} /><span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('photo_add')}</span></>
            }
          </label>
        )}
      </div>

      {photos.length > 0 && (
        <p style={{ color: '#444', fontSize: 11, marginTop: 8 }}>
          {photos.length}/20 {t('photo_hint')}
        </p>
      )}

      {photos.length === 0 && !uploading && (
        <div style={{
          textAlign: 'center', padding: '24px 0 8px',
          color: '#444', fontSize: 13,
        }}>
          {t('photo_empty')}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
