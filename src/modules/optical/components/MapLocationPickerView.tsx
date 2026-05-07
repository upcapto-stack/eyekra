'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BottomNav } from '@/shared/components/layout/BottomNav';
import { addLocation, getLocations, setSelectedLocationIndex } from '@/shared/utils/location';
import { reverseGeocodeNominatim, searchNominatim, type NominatimSearchResult } from '@/shared/utils/nominatim';

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]; // India
const ADDRESS_TYPES = [
  { value: 'Home', label: 'Home' },
  { value: 'Work', label: 'Work' },
  { value: 'Other', label: 'Other' },
] as const;

export function MapLocationPickerView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCurrentLocationMode = searchParams.get('mode') === 'current';
  const returnTo = searchParams.get('returnTo') || '/home';

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<{ setView: (latlng: [number, number], zoom: number) => void } | null>(null);
  const markerRef = useRef<{ setLatLng: (latlng: [number, number]) => void } | null>(null);

  const [mounted, setMounted] = useState(false);
  const [lat, setLat] = useState(DEFAULT_CENTER[0]);
  const [lng, setLng] = useState(DEFAULT_CENTER[1]);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [addressType, setAddressType] = useState('Home');
  const [flatNo, setFlatNo] = useState('');
  const [apartmentStreet, setApartmentStreet] = useState('');
  const [contact, setContact] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || !mapRef.current) return;

    let cancelled = false;
    let map: ReturnType<typeof import('leaflet').map> | null = null;

    const initMap = async () => {
      const L = await import('leaflet');
      if (typeof document !== 'undefined' && !document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (cancelled || !mapRef.current) return;
      const el = mapRef.current;
      map = L.map(el).setView([lat, lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      const marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setLat(pos.lat);
        setLng(pos.lng);
        reverseGeocodeNominatim(pos.lat, pos.lng, setAddress);
      });
      reverseGeocodeNominatim(lat, lng, setAddress);

      if (!cancelled) {
        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else if (map) {
        map.remove();
      }
    };

    initMap();
    return () => {
      cancelled = true;
      const m = mapInstanceRef.current as { remove?: () => void } | null;
      if (m && typeof m.remove === 'function') m.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [lat, lng, mounted]);

  const updateMapPosition = (latVal: number, lngVal: number) => {
    setLat(latVal);
    setLng(lngVal);
    mapInstanceRef.current?.setView([latVal, lngVal], 15);
    markerRef.current?.setLatLng([latVal, lngVal]);
    reverseGeocodeNominatim(latVal, lngVal, setAddress);
  };

  const handleSearch = () => {
    searchNominatim(searchQuery, (results) => {
      setSearchResults(results);
      setShowSearchResults(true);
    });
  };

  const handleSelectSearchResult = (r: NominatimSearchResult) => {
    const latVal = parseFloat(r.lat);
    const lngVal = parseFloat(r.lon);
    updateMapPosition(latVal, lngVal);
    setAddress(r.display_name);
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults([]);
  };

  const handleCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setAddress('Location not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updateMapPosition(latitude, longitude);
      },
      () => setAddress('Could not get location')
    );
  };

  const handleConfirmProceed = () => {
    setStep(2);
  };

  const handleSaveCurrentLocation = () => {
    if (!address.trim()) return;
    addLocation({
      displayName: 'Current location',
      address: address.trim(),
    });
    const list = getLocations();
    setSelectedLocationIndex(list.length - 1);
    router.replace(returnTo);
  };

  const handleSaveAddress = () => {
    const displayName = addressType;
    const fullAddress = [flatNo.trim(), apartmentStreet.trim(), address].filter(Boolean).join(', ');
    if (!fullAddress.trim()) return;
    addLocation({
      displayName,
      address: fullAddress.trim(),
      flatNo: [flatNo.trim(), apartmentStreet.trim()].filter(Boolean).join(', ') || undefined,
      contact: contact.trim() || undefined,
    });
    const list = getLocations();
    setSelectedLocationIndex(list.length - 1);
    router.replace(returnTo);
  };

  if (step === 2 && !isCurrentLocationMode) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900 pb-20">
        <header className="safe-top sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 py-2.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="flex-1 text-lg font-bold text-slate-900 dark:text-slate-100 text-center">Address details</h1>
          <span className="w-9" aria-hidden />
        </header>
        <main className="flex-1 px-4 py-5 max-w-md mx-auto w-full">
          {/* Map se generate hua address - clearly show */}
          <div className="mb-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Address from map</p>
            <p className="text-slate-900 dark:text-slate-100 text-sm leading-relaxed">{address || '—'}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Address type</label>
              <select
                value={addressType}
                onChange={(e) => setAddressType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 text-sm"
              >
                {ADDRESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Flat no <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={flatNo}
                onChange={(e) => setFlatNo(e.target.value)}
                placeholder="e.g. 102, Tower A"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Apartment / Street <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={apartmentStreet}
                onChange={(e) => setApartmentStreet(e.target.value)}
                placeholder="e.g. Green Valley Apartments, MG Road"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Mobile number</label>
              <input
                type="tel"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="10-digit mobile"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveAddress}
            className="mt-6 w-full py-3.5 rounded-xl bg-[#fe5001] text-white font-semibold text-base"
          >
            Save address
          </button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900 pb-0">
      <header className="safe-top sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 py-2.5 flex items-center gap-2">
        <Link
          href={returnTo !== '/home' ? `/select-location?returnTo=${encodeURIComponent(returnTo)}` : '/select-location'}
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        {!isCurrentLocationMode && (
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
              placeholder="Search an area or address"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 pl-4 pr-10 py-2.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 text-sm"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600"
              aria-label="Search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg py-2 z-40 max-h-48 overflow-y-auto">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectSearchResult(r)}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 truncate"
                  >
                    {r.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {isCurrentLocationMode && (
          <h1 className="flex-1 text-lg font-bold text-slate-900 dark:text-slate-100 text-center">Use current location</h1>
        )}
      </header>

      <div className="relative flex-1 min-h-[320px]" style={{ height: 'min(60vh, 400px)' }}>
        <div ref={mapRef} className="absolute inset-0 w-full h-full bg-slate-200 dark:bg-slate-700" />
        {!mounted && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-200 dark:bg-slate-700">
            <p className="text-slate-500 dark:text-slate-400 text-sm">Loading map…</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleCurrentLocation}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-lg text-sm font-medium text-slate-700 dark:text-slate-200 z-[400]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-[#fe5001]">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2" strokeLinecap="round" />
          </svg>
          Current location
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 rounded-t-2xl px-4 pt-4 pb-6 safe-bottom">
        {!isCurrentLocationMode && (
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-2">Place the pin at exact delivery location</p>
        )}
        <div className="flex items-start gap-2 mb-3">
          <span className="shrink-0 w-6 h-6 flex items-center justify-center text-[#fe5001]">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </span>
          <p className="text-slate-900 dark:text-slate-100 text-sm font-medium flex-1 min-w-0 break-words">
            {address || (isCurrentLocationMode ? 'Tap Locate then Save' : 'Moving pin…')}
          </p>
        </div>
        {isCurrentLocationMode ? (
          <button
            type="button"
            onClick={handleSaveCurrentLocation}
            className="w-full py-3.5 rounded-xl bg-[#fe5001] text-white font-semibold text-base"
          >
            Save
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConfirmProceed}
            className="w-full py-3.5 rounded-xl bg-[#fe5001] text-white font-semibold text-base"
          >
            Confirm & proceed
          </button>
        )}
      </div>
    </div>
  );
}
