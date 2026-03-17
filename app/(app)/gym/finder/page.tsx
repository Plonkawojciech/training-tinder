'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Search, Star, Navigation, CheckCircle } from 'lucide-react';
import type { GymPlace } from '@/components/maps/gym-map';
import { Button } from '@/components/ui/button';

const GymMap = dynamic(
  () => import('@/components/maps/gym-map').then((m) => m.GymMap),
  { ssr: false, loading: () => <div className="w-full h-full skeleton" /> }
);

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function GymFinderPage() {
  const [gyms, setGyms] = useState<GymPlace[]>([]);
  const [userLat, setUserLat] = useState<number | undefined>();
  const [userLng, setUserLng] = useState<number | undefined>();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [settingGym, setSettingGym] = useState<string | null>(null);
  const [successGym, setSuccessGym] = useState<string | null>(null);

  async function fetchGyms(lat: number, lng: number) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/maps/gyms?lat=${lat}&lng=${lng}&radius=5000`);
      if (!res.ok) throw new Error('Failed to fetch gyms');
      const data: GymPlace[] = await res.json();
      setGyms(data);
      if (data.length === 0) setError('Brak siłowni w tym obszarze. Spróbuj poszerzyć wyszukiwanie.');
    } catch {
      setError('Błąd podczas wyszukiwania siłowni. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setError('Twoja przeglądarka nie obsługuje geolokalizacji.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLat(latitude);
        setUserLng(longitude);
        fetchGyms(latitude, longitude);
        setLocating(false);
      },
      () => {
        setError('Nie udało się pobrać lokalizacji. Wpisz adres ręcznie.');
        setLocating(false);
      }
    );
  }

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;

    setLoading(true);
    setError('');

    try {
      const geoRes = await fetch('/api/maps/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: search }),
      });

      if (!geoRes.ok) throw new Error('Address not found');

      const { lat, lng } = await geoRes.json() as { lat: number; lng: number };
      setUserLat(lat);
      setUserLng(lng);
      await fetchGyms(lat, lng);
    } catch {
      setError('Nie znaleziono podanego adresu. Spróbuj ponownie.');
      setLoading(false);
    }
  }

  async function handleSetGym(gym: GymPlace) {
    setSettingGym(gym.place_id);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gymName: gym.name }),
      });
      if (res.ok) {
        setSuccessGym(gym.place_id);
        setTimeout(() => setSuccessGym(null), 4000);
      }
    } finally {
      setSettingGym(null);
    }
  }

  function renderStars(rating: number) {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${i < Math.round(rating) ? 'text-[#FFD700] fill-[#FFD700]' : 'text-[#333333]'}`}
      />
    ));
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <MapPin className="w-6 h-6 text-[#6366F1]" />
          <h1 className="font-display text-3xl text-white tracking-wider">ZNAJDŹ SIŁOWNIĘ</h1>
        </div>
        <p className="text-[#888888] text-sm">Odkryj siłownie w pobliżu, ustaw swoją domową siłownię</p>
      </div>

      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleUseMyLocation}
          loading={locating}
          className="shrink-0"
        >
          <Navigation className="w-4 h-4" />
          Użyj mojej lokalizacji
        </Button>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Wpisz miasto lub adres..."
              className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] pl-9 pr-3 py-2.5 text-sm placeholder:text-[#444444]"
            />
          </div>
          <Button type="submit" loading={loading && !locating}>
            Szukaj
          </Button>
        </form>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-900 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Map */}
      {(userLat !== undefined || gyms.length > 0) && (
        <div className="mb-6 border border-[var(--border)]" style={{ height: 500 }}>
          <GymMap
            gyms={gyms}
            userLat={userLat}
            userLng={userLng}
            onSelectGym={(gym) => handleSetGym(gym)}
          />
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 skeleton" />
          ))}
        </div>
      )}

      {/* Gym list */}
      {!loading && gyms.length > 0 && (
        <div>
          <h2 className="font-display text-sm text-[#888888] tracking-wider mb-3">
            {gyms.length} SIŁOWNI ZNALEZIONYCH
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gyms.map((gym) => {
              const dist =
                userLat !== undefined && userLng !== undefined
                  ? distanceKm(userLat, userLng, gym.lat, gym.lng)
                  : null;

              return (
                <div key={gym.place_id} className="bg-[var(--bg-card)] border border-[var(--border)] p-4 flex flex-col gap-3">
                  <div>
                    <h3 className="font-display text-white text-sm tracking-wider leading-tight mb-1">{gym.name}</h3>
                    <p className="text-xs text-[#888888]">{gym.address}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {gym.rating !== undefined && (
                      <div className="flex items-center gap-1">
                        <div className="flex">{renderStars(gym.rating)}</div>
                        <span className="text-xs text-[#888888]">{gym.rating.toFixed(1)}</span>
                      </div>
                    )}
                    <span
                      className={`text-xs px-1.5 py-0.5 ${
                        gym.open_now
                          ? 'text-green-400 border border-green-800 bg-green-900/20'
                          : gym.open_now === false
                          ? 'text-red-400 border border-red-800 bg-red-900/20'
                          : 'text-[#888888] border border-[var(--border)]'
                      }`}
                    >
                      {gym.open_now === undefined ? 'Godziny N/D' : gym.open_now ? 'Otwarte' : 'Zamknięte'}
                    </span>
                    {dist !== null && (
                      <span className="text-xs text-[#555555] ml-auto">{dist.toFixed(1)} km</span>
                    )}
                  </div>

                  {successGym === gym.place_id ? (
                    <div className="flex items-center gap-2 text-green-400 text-xs py-2">
                      <CheckCircle className="w-4 h-4" />
                      Ustawiono jako Twoja siłownia!
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSetGym(gym)}
                      disabled={settingGym === gym.place_id}
                      className="mt-auto py-2 bg-[#6366F1] text-white text-xs font-semibold uppercase tracking-wider hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] disabled:opacity-50 transition-all"
                    >
                      {settingGym === gym.place_id ? 'Ustawianie...' : 'Ustaw jako moją siłownię'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && gyms.length === 0 && userLat === undefined && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <MapPin className="w-14 h-14 text-[#2A2A2A]" />
          <h3 className="font-display text-xl text-[#888888]">ZNAJDŹ SIŁOWNIĘ</h3>
          <p className="text-[#888888] text-sm max-w-xs">
            Użyj lokalizacji lub wyszukaj miasto, aby znaleźć pobliskie siłownie.
          </p>
        </div>
      )}
    </div>
  );
}
