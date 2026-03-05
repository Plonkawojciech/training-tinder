'use client';

import { useEffect, useRef, useState } from 'react';
import { DARK_MAP_STYLE } from '@/lib/maps';
import { initGoogleMaps } from '@/lib/maps-loader';
import type { PlaceResult } from '@/lib/maps';

export interface GymPlace extends PlaceResult {}

interface GymMapProps {
  gyms: GymPlace[];
  userLat?: number;
  userLng?: number;
  onSelectGym?: (gym: GymPlace) => void;
}

interface InfoCard {
  gym: GymPlace;
}

export function GymMap({ gyms, userLat, userLng, onSelectGym }: GymMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const [selectedCard, setSelectedCard] = useState<InfoCard | null>(null);
  const [settingGym, setSettingGym] = useState<string | null>(null);
  const [setSuccess, setSetSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function initMap() {
      await initGoogleMaps(['maps', 'marker']);

      if (!mapRef.current) return;

      const centerLat = userLat ?? gyms[0]?.lat ?? 51.505;
      const centerLng = userLng ?? gyms[0]?.lng ?? -0.09;

      const map = new google.maps.Map(mapRef.current, {
        center: { lat: centerLat, lng: centerLng },
        zoom: 13,
        styles: DARK_MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
      });

      mapInstanceRef.current = map;

      if (userLat !== undefined && userLng !== undefined) {
        const userMarker = new google.maps.Marker({
          position: { lat: userLat, lng: userLng },
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#00D4FF',
            fillOpacity: 1,
            strokeColor: '#0A0A0A',
            strokeWeight: 3,
          },
          title: 'Your Location',
          zIndex: 1000,
        });
        userMarkerRef.current = userMarker;
      }

      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      gyms.forEach((gym) => {
        const marker = new google.maps.Marker({
          position: { lat: gym.lat, lng: gym.lng },
          map,
          icon: {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
            fillColor: '#FF4500',
            fillOpacity: 1,
            strokeColor: '#FF6633',
            strokeWeight: 1,
            scale: 1.5,
            anchor: new google.maps.Point(12, 22),
          },
          title: gym.name,
        });

        marker.addListener('click', () => {
          setSelectedCard({ gym });
          map.panTo({ lat: gym.lat, lng: gym.lng });
        });

        markersRef.current.push(marker);
      });

      map.addListener('click', () => {
        setSelectedCard(null);
      });
    }

    initMap().catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gyms, userLat, userLng]);

  async function handleSetGym(gym: GymPlace) {
    setSettingGym(gym.place_id);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gymName: gym.name }),
      });
      if (res.ok) {
        setSetSuccess(gym.place_id);
        onSelectGym?.(gym);
        setTimeout(() => setSetSuccess(null), 3000);
      }
    } finally {
      setSettingGym(null);
    }
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {selectedCard && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-72 bg-[#111111] border border-[#2A2A2A] p-4 z-50 shadow-2xl">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-display text-white text-sm tracking-wider">{selectedCard.gym.name}</h3>
              <p className="text-xs text-[#888888] mt-0.5">{selectedCard.gym.address}</p>
            </div>
            <button
              onClick={() => setSelectedCard(null)}
              className="text-[#888888] hover:text-white ml-2 shrink-0 text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex items-center gap-3 mb-3">
            {selectedCard.gym.rating !== undefined && (
              <div className="flex items-center gap-1">
                <span className="text-[#FFD700] text-xs">★</span>
                <span className="text-xs text-white">{selectedCard.gym.rating.toFixed(1)}</span>
              </div>
            )}
            <span
              className={`text-xs px-2 py-0.5 ${
                selectedCard.gym.open_now
                  ? 'bg-green-900/40 text-green-400 border border-green-800'
                  : 'bg-red-900/40 text-red-400 border border-red-800'
              }`}
            >
              {selectedCard.gym.open_now === undefined ? 'Hours unknown' : selectedCard.gym.open_now ? 'Open now' : 'Closed'}
            </span>
          </div>

          {setSuccess === selectedCard.gym.place_id ? (
            <div className="text-center py-2 text-xs text-green-400">Gym set successfully!</div>
          ) : (
            <button
              onClick={() => handleSetGym(selectedCard.gym)}
              disabled={settingGym === selectedCard.gym.place_id}
              className="w-full py-2 bg-[#FF4500] text-white text-xs font-semibold uppercase tracking-wider hover:shadow-[0_0_15px_rgba(255,69,0,0.4)] disabled:opacity-50 transition-all"
            >
              {settingGym === selectedCard.gym.place_id ? 'Setting...' : 'Set as My Gym'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
