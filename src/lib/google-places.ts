/**
 * Load Google Maps JavaScript API with Places library.
 * Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local
 */

export interface PlaceWithGeometry {
  formatted_address: string;
  lat: number;
  lng: number;
}

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (el: HTMLElement, opts?: { center?: { lat: number; lng: number }; zoom?: number }) => {
          setCenter: (c: { lat: number; lng: number }) => void;
          setZoom: (z: number) => void;
          addListener: (event: string, fn: () => void) => void;
          fitBounds: (b: { getNorthEast: () => { lat: () => number; lng: () => number }; getSouthWest: () => { lat: () => number; lng: () => number } }) => void;
        };
        Marker: new (opts?: { position: { lat: number; lng: number }; map: unknown; draggable?: boolean }) => {
          setPosition: (p: { lat: number; lng: number }) => void;
          getPosition: () => { lat: () => number; lng: () => number };
          addListener: (event: string, fn: () => void) => void;
        };
        LatLng: new (lat: number, lng: number) => { lat: () => number; lng: () => number };
        event: { clearInstanceListeners: (obj: unknown) => void };
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: { types?: string[]; componentRestrictions?: { country: string | string[] } }
          ) => {
            getPlace: () => {
              formatted_address?: string;
              geometry?: { location?: { lat: () => number; lng: () => number } };
            };
            addListener: (event: string, fn: () => void) => void;
          };
        };
        Geocoder?: new () => {
          geocode: (
            request: { location: { lat: number; lng: number } },
            callback: (results: { formatted_address?: string }[] | null, status: string) => void
          ) => void;
        };
      };
    };
  }
}

const SCRIPT_ID = 'google-maps-places-script';

function getApiKey(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
}

export function loadGooglePlacesScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  const key = getApiKey();
  if (!key) return Promise.resolve(false);

  if (window.google?.maps?.places) return Promise.resolve(true);
  if (document.getElementById(SCRIPT_ID)) {
    return new Promise((resolve) => {
      const check = () => {
        if (window.google?.maps?.places) resolve(true);
        else setTimeout(check, 100);
      };
      check();
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const check = () => {
        if (window.google?.maps?.places) resolve(true);
        else setTimeout(check, 50);
      };
      check();
    };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export function initAddressAutocomplete(
  inputEl: HTMLInputElement | null,
  onPlaceSelect: (formattedAddress: string) => void
): (() => void) | void {
  if (!inputEl || !window.google?.maps?.places) return;
  const autocomplete = new window.google.maps.places.Autocomplete(inputEl, {
    types: ['address'],
    componentRestrictions: { country: 'in' },
  });
  const listener = () => {
    const place = autocomplete.getPlace();
    if (place?.formatted_address) onPlaceSelect(place.formatted_address);
  };
  autocomplete.addListener('place_changed', listener);
  return () => {
    try {
      if (window.google?.maps?.event?.clearInstanceListeners) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    } catch {
      // ignore
    }
  };
}

/**
 * Init address autocomplete and return place with lat/lng when geometry is available.
 */
export function initAddressAutocompleteWithGeometry(
  inputEl: HTMLInputElement | null,
  onPlaceSelect: (place: PlaceWithGeometry) => void
): (() => void) | void {
  if (!inputEl || !window.google?.maps?.places) return;
  const autocomplete = new window.google.maps.places.Autocomplete(inputEl, {
    types: ['address'],
    componentRestrictions: { country: 'in' },
  });
  const listener = () => {
    const place = autocomplete.getPlace();
    if (!place?.formatted_address) return;
    const loc = place.geometry?.location;
    if (loc) {
      const latValue =
        typeof loc.lat === 'function'
          ? loc.lat()
          : Number((loc as unknown as { lat?: number }).lat ?? 0);
      const lngValue =
        typeof loc.lng === 'function'
          ? loc.lng()
          : Number((loc as unknown as { lng?: number }).lng ?? 0);
      onPlaceSelect({
        formatted_address: place.formatted_address,
        lat: latValue,
        lng: lngValue,
      });
    } else {
      onPlaceSelect({ formatted_address: place.formatted_address, lat: 0, lng: 0 });
    }
  };
  autocomplete.addListener('place_changed', listener);
  return () => {
    try {
      if (window.google?.maps?.event?.clearInstanceListeners) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    } catch {
      // ignore
    }
  };
}

export function reverseGeocode(
  lat: number,
  lng: number,
  onResult: (address: string) => void
): void {
  if (typeof window === 'undefined' || !window.google?.maps?.Geocoder) {
    onResult(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    return;
  }
  const geocoder = new window.google.maps.Geocoder();
  geocoder.geocode(
    { location: { lat, lng } },
    (results, status) => {
      if (status === 'OK' && results?.[0]?.formatted_address) {
        onResult(results[0].formatted_address);
      } else {
        onResult(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    }
  );
}
