'use client';

import { useEffect, useRef, useState } from 'react';
import { DARK_MAP_STYLE } from '@/lib/maps';
import { loadGoogleMapsAPI } from '@/lib/maps-loader';
import { getSportColor, getSportLabel } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

interface AthleteMarker {
  id: string;
  lat: number;
  lng: number;
  sport: string;
  username: string | null;
  avatarUrl?: string | null;
}

interface AthletesMapProps {
  athletes: AthleteMarker[];
}

interface ProfilePopup {
  athlete: AthleteMarker;
}

export function AthletesMap({ athletes }: AthletesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const [popup, setPopup] = useState<ProfilePopup | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      await loadGoogleMapsAPI();

      if (!mapRef.current) return;

      const center =
        athletes.length > 0
          ? { lat: athletes[0].lat, lng: athletes[0].lng }
          : { lat: 51.505, lng: -0.09 };

      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 9,
        styles: DARK_MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
      });

      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      circlesRef.current.forEach((c) => c.setMap(null));
      circlesRef.current = [];

      athletes.forEach((athlete) => {
        const color = getSportColor(athlete.sport);

        const jitterLat = athlete.lat + (Math.random() - 0.5) * 0.1;
        const jitterLng = athlete.lng + (Math.random() - 0.5) * 0.1;

        const circle = new google.maps.Circle({
          map,
          center: { lat: jitterLat, lng: jitterLng },
          radius: 8000, // 8km in meters
          fillColor: color,
          fillOpacity: 0.12,
          strokeColor: color,
          strokeOpacity: 0.6,
          strokeWeight: 2,
          clickable: true,
        });

        circle.addListener('click', () => {
          setPopup({ athlete });
          map.panTo({ lat: jitterLat, lng: jitterLng });
        });

        circlesRef.current.push(circle);
      });

      map.addListener('click', () => setPopup(null));

      setReady(true);
    }

    init().catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athletes]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {!ready && (
        <div className="absolute inset-0 bg-[var(--bg)] flex items-center justify-center">
          <div className="text-[#888888] text-sm">Ładowanie mapy sportowców...</div>
        </div>
      )}

      {popup && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 bg-[var(--bg-card)] border border-[var(--border)] p-4 z-50 shadow-2xl">
          <div className="flex items-center gap-3 mb-3">
            {popup.athlete.avatarUrl ? (
              <Image
                src={popup.athlete.avatarUrl}
                alt={popup.athlete.username ?? 'Sportowiec'}
                width={40}
                height={40}
                className="w-10 h-10 object-cover"
              />
            ) : (
              <div
                className="w-10 h-10 flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: getSportColor(popup.athlete.sport) }}
              >
                {(popup.athlete.username ?? 'A')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-white text-sm font-semibold">
                {popup.athlete.username ?? 'Sportowiec'}
              </p>
              <span
                className="text-xs px-1.5 py-0.5"
                style={{
                  color: getSportColor(popup.athlete.sport),
                  border: `1px solid ${getSportColor(popup.athlete.sport)}40`,
                }}
              >
                {getSportLabel(popup.athlete.sport)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/profile/${popup.athlete.id}`}
              className="flex-1 py-1.5 text-center text-xs font-semibold uppercase tracking-wider border border-[var(--border)] text-[#888888] hover:text-white hover:border-[#6366F1] transition-all"
            >
              Pokaż profil
            </Link>
            <button
              onClick={() => setPopup(null)}
              className="px-3 py-1.5 text-xs text-[#888888] hover:text-white border border-[var(--border)] transition-all"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
