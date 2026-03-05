// Google Maps initialization utility
export async function initGoogleMaps(libraries: string[] = ['maps']) {
  const { Loader } = await import('@googlemaps/js-api-loader');
  const loader = new Loader({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    version: 'weekly',
    libraries: libraries as ('marker' | 'geocoding')[],
  });
  await (loader as unknown as { load: () => Promise<void> }).load();
}
