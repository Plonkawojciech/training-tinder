// Google Maps initialization utility using the functional API from @googlemaps/js-api-loader v2
// setOptions() and importLibrary() replace the deprecated Loader class

async function loadGoogleMapsAPI(libs: string[]) {
  // Using named imports - the functional API uses 'key' not 'apiKey'
  const mapsModule = await import('@googlemaps/js-api-loader');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mapsModule.setOptions as (opts: Record<string, unknown>) => void)({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY! });
  for (const lib of libs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (mapsModule.importLibrary as (name: string) => Promise<any>)(lib);
  }
}

export { loadGoogleMapsAPI };
