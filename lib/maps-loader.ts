// Google Maps initialization — simple script injection, single promise singleton

let _promise: Promise<void> | null = null;

export function loadGoogleMapsAPI(_libs?: string[]): Promise<void> {
  if (_promise) return _promise;

  _promise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Server-side: cannot load Maps'));
      return;
    }

    // Already loaded
    if (window.google?.maps?.Map) {
      resolve();
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
    if (!apiKey) {
      reject(new Error('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'));
      return;
    }

    const cb = '__gmcb_' + Math.random().toString(36).slice(2);
    (window as unknown as Record<string, () => void>)[cb] = () => {
      delete (window as unknown as Record<string, () => void>)[cb];
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geocoding,marker&callback=${cb}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      _promise = null;
      reject(new Error('Google Maps script failed to load'));
    };
    document.head.appendChild(script);
  });

  return _promise;
}
