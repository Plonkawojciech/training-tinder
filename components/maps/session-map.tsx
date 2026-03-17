'use client';

import { useEffect, useRef, useState } from 'react';
import { DARK_MAP_STYLE } from '@/lib/maps';
import { loadGoogleMapsAPI } from '@/lib/maps-loader';
import { Search, MapPin, Loader } from 'lucide-react';

interface SessionMapProps {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number, address: string) => void;
}

export function SessionMap({ lat, lng, onChange }: SessionMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      await loadGoogleMapsAPI();

      if (!mapRef.current) return;

      const center =
        lat !== undefined && lng !== undefined
          ? { lat, lng }
          : { lat: 51.505, lng: -0.09 };

      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: lat !== undefined ? 14 : 11,
        styles: DARK_MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
      });

      mapInstanceRef.current = map;
      geocoderRef.current = new google.maps.Geocoder();

      if (lat !== undefined && lng !== undefined) {
        placeMarker({ lat, lng }, map);
      }

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        placeMarker(pos, map);
        reverseGeocode(pos);
      });

      setReady(true);
    }

    init().catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function placeMarker(pos: { lat: number; lng: number }, map: google.maps.Map) {
    if (markerRef.current) {
      markerRef.current.setPosition(pos);
    } else {
      markerRef.current = new google.maps.Marker({
        position: pos,
        map,
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor: '#6366F1',
          fillOpacity: 1,
          strokeColor: '#818CF8',
          strokeWeight: 1,
          scale: 1.8,
          anchor: new google.maps.Point(12, 22),
        },
        draggable: true,
      });

      markerRef.current.addListener('dragend', () => {
        const pos2 = markerRef.current?.getPosition();
        if (!pos2) return;
        const p = { lat: pos2.lat(), lng: pos2.lng() };
        reverseGeocode(p);
      });
    }
  }

  function reverseGeocode(pos: { lat: number; lng: number }) {
    if (!geocoderRef.current) return;
    geocoderRef.current.geocode({ location: pos }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const address = results[0].formatted_address;
        onChange(pos.lat, pos.lng, address);
        setSearch(address);
      } else {
        onChange(pos.lat, pos.lng, `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
      }
    });
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim() || !mapInstanceRef.current) return;

    setSearching(true);
    setError('');

    try {
      const res = await fetch('/api/maps/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: search }),
      });

      if (!res.ok) throw new Error('Not found');

      const { lat: gLat, lng: gLng } = (await res.json()) as {
        lat: number;
        lng: number;
      };
      const pos = { lat: gLat, lng: gLng };

      mapInstanceRef.current.panTo(pos);
      mapInstanceRef.current.setZoom(15);
      placeMarker(pos, mapInstanceRef.current);
      onChange(gLat, gLng, search);
    } catch {
      setError('Nie znaleziono lokalizacji. Spróbuj inny adres.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Wyszukaj adres lub kliknij na mapę..."
            className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] pl-9 pr-3 py-2.5 text-sm placeholder:text-[#444444]"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="px-4 py-2.5 bg-[#6366F1] text-white text-xs font-semibold uppercase tracking-wider hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] disabled:opacity-50"
        >
          {searching ? <Loader className="w-4 h-4 animate-spin" /> : 'Szukaj'}
        </button>
      </form>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="relative">
        <div ref={mapRef} className="w-full h-64 border border-[var(--border)]" />
        {!ready && (
          <div className="absolute inset-0 bg-[var(--bg)] flex items-center justify-center border border-[var(--border)]">
            <div className="flex items-center gap-2 text-[#888888] text-sm">
              <MapPin className="w-4 h-4 animate-bounce text-[#6366F1]" />
              Ładowanie mapy...
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-[#555555]">
        Kliknij na mapę, aby ustawić lokalizację sesji
      </p>
    </div>
  );
}
