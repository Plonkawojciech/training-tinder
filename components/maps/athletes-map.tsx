'use client';

import { useEffect, useRef, useState } from 'react';
import { DARK_MAP_STYLE } from '@/lib/maps';
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
  const [popup, setPopup] = useState<ProfilePopup | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      const { Loader } = await import('@googlemaps/js-api-loader');
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        version: 'weekly',
        libraries: ['marker'],
      });
      await (loader as unknown as { load: () => Promise<void> }).load();

      if (!mapRef.current) return;

      const center = athletes.length > 0
        ? { lat: athletes[0].lat, lng: athletes[0].lng }
        : { lat: 51.505, lng: -0.09 };

      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 11,
        styles: DARK_MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
      });

      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      athletes.forEach((athlete) => {
        const color = getSportColor(athlete.sport);

        const marker = new google.maps.Marker({
          position: { lat: athlete.lat, lng: athlete.lng },
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: color,
            fillOpacity: 0.9,
            strokeColor: '#0A0A0A',
            strokeWeight: 2,
          },
          title: athlete.username ?? 'Athlete',
        });

        marker.addListener('click', () => {
          setPopup({ athlete });
          map.panTo({ lat: athlete.lat, lng: athlete.lng });
        });

        markersRef.current.push(marker);
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
        <div className="absolute inset-0 bg-[#0A0A0A] flex items-center justify-center">
          <div className="text-[#888888] text-sm">Loading athletes map...</div>
        </div>
      )}

      {popup && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 bg-[#111111] border border-[#2A2A2A] p-4 z-50 shadow-2xl">
          <div className="flex items-center gap-3 mb-3">
            {popup.athlete.avatarUrl ? (
              <Image
                src={popup.athlete.avatarUrl}
                alt={popup.athlete.username ?? 'Athlete'}
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
              <p className="text-white text-sm font-semibold">{popup.athlete.username ?? 'Athlete'}</p>
              <span
                className="text-xs px-1.5 py-0.5"
                style={{ color: getSportColor(popup.athlete.sport), border: `1px solid ${getSportColor(popup.athlete.sport)}40` }}
              >
                {getSportLabel(popup.athlete.sport)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/profile/${popup.athlete.id}`}
              className="flex-1 py-1.5 text-center text-xs font-semibold uppercase tracking-wider border border-[#2A2A2A] text-[#888888] hover:text-white hover:border-[#FF4500] transition-all"
            >
              View Profile
            </Link>
            <button
              onClick={() => setPopup(null)}
              className="px-3 py-1.5 text-xs text-[#888888] hover:text-white border border-[#2A2A2A] transition-all"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
