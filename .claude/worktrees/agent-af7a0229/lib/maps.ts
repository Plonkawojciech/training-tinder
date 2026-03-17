export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0A0A0A' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#888888' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0A0A' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1A1A1A' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2A2A2A' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.business', elementType: 'labels.icon', stylers: [{ color: '#FF4500' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

export interface PlaceResult {
  name: string;
  address: string;
  place_id: string;
  lat: number;
  lng: number;
  rating?: number;
  open_now?: boolean;
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json() as {
    status: string;
    results: Array<{
      geometry: { location: { lat: number; lng: number } };
    }>;
  };

  if (data.status !== 'OK' || !data.results.length) return null;
  const loc = data.results[0].geometry.location;
  return { lat: loc.lat, lng: loc.lng };
}

export async function searchNearbyGyms(lat: number, lng: number, radius = 5000): Promise<PlaceResult[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return [];

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=gym&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json() as {
    status: string;
    results: Array<{
      name: string;
      vicinity: string;
      place_id: string;
      geometry: { location: { lat: number; lng: number } };
      rating?: number;
      opening_hours?: { open_now?: boolean };
    }>;
  };

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return [];

  return (data.results ?? []).map((p) => ({
    name: p.name,
    address: p.vicinity,
    place_id: p.place_id,
    lat: p.geometry.location.lat,
    lng: p.geometry.location.lng,
    rating: p.rating,
    open_now: p.opening_hours?.open_now,
  }));
}

export function formatAddress(components: Array<{ long_name: string; types: string[] }>): string {
  const streetNumber = components.find((c) => c.types.includes('street_number'))?.long_name ?? '';
  const route = components.find((c) => c.types.includes('route'))?.long_name ?? '';
  const locality = components.find((c) => c.types.includes('locality'))?.long_name ?? '';
  const country = components.find((c) => c.types.includes('country'))?.long_name ?? '';

  const parts = [
    streetNumber && route ? `${streetNumber} ${route}` : route || streetNumber,
    locality,
    country,
  ].filter(Boolean);

  return parts.join(', ');
}
