/**
 * Reverse geocoding: BigDataCloud (works from browser, no API key).
 * Search: Nominatim (OpenStreetMap).
 */

const USER_AGENT = 'EyekraApp/1.0 (contact@eyekra.com)';

interface BigDataCloudReverseResult {
  locality?: string;
  city?: string;
  principalSubdivision?: string;
  countryName?: string;
  postcode?: string;
  localityInfo?: {
    administrative?: Array<{ name?: string; adminLevel?: number }>;
  };
}

function buildAddressFromBigDataCloud(d: BigDataCloudReverseResult): string {
  const parts = [
    d.locality,
    d.city,
    d.principalSubdivision,
    d.postcode,
    d.countryName,
  ].filter(Boolean) as string[];
  const unique = Array.from(new Set(parts));
  return unique.join(', ') || '';
}

export function reverseGeocodeNominatim(
  lat: number,
  lng: number,
  onResult: (address: string) => void
): void {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}`;
  fetch(url)
    .then((res) => res.json())
    .then((data: BigDataCloudReverseResult) => {
      const address = buildAddressFromBigDataCloud(data);
      onResult(address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    })
    .catch(() => onResult(`${lat.toFixed(5)}, ${lng.toFixed(5)}`));
}

export interface NominatimSearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

export function searchNominatim(
  query: string,
  onResults: (results: NominatimSearchResult[]) => void
): void {
  if (!query.trim()) {
    onResults([]);
    return;
  }
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
  fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    .then((res) => res.json())
    .then((data: NominatimSearchResult[]) => onResults(Array.isArray(data) ? data : []))
    .catch(() => onResults([]));
}
