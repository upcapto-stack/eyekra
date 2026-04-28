'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AppScreen } from '@/components/layout/AppScreen';
import { AddressAutocompleteInput } from '@/components/ui/AddressAutocompleteInput';
import {
  getLocations,
  getSelectedIndex,
  setSelectedLocationIndex,
  addLocation,
  removeLocationAtIndex,
  type SavedLocation,
} from '@/lib/location';

const INITIAL_VISIBLE = 3;

function LocationIcon({ displayName }: { displayName: string }) {
  const name = displayName.toLowerCase();
  const className = 'w-5 h-5 text-slate-500 dark:text-slate-400';
  const stroke = 2;
  const round = 'round';
  if (name === 'home') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  }
  if (name === 'work') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function SelectLocationView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/home';
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [selectedIndex, setSelectedIdx] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocations(getLocations());
    setSelectedIdx(getSelectedIndex());
  }, []);

  useEffect(() => {
    if (menuIndex === null) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuIndex(null);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuIndex]);

  const handleSelect = (index: number) => {
    setSelectedLocationIndex(index);
    setSelectedIdx(index);
    setMenuIndex(null);
    router.replace(returnTo);
  };

  const handleSetDefault = (index: number) => {
    setSelectedLocationIndex(index);
    setSelectedIdx(index);
    setMenuIndex(null);
    router.replace(returnTo);
  };

  const handleRemove = (index: number) => {
    removeLocationAtIndex(index);
    setLocations(getLocations());
    setSelectedIdx(getSelectedIndex());
    setMenuIndex(null);
  };

  const handleSearchSelect = (address: string) => {
    if (!address.trim()) return;
    const displayName = searchValue.trim() || 'New address';
    const loc: SavedLocation = { displayName, address: address.trim() };
    addLocation(loc);
    const list = getLocations();
    setLocations(list);
    setSelectedLocationIndex(list.length - 1);
    setSelectedIdx(list.length - 1);
    setSearchValue('');
    router.replace(returnTo);
  };

  const handleUseCurrentLocation = () => {
    router.push(`/select-location/map?mode=current${returnTo !== '/home' ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`);
  };

  const handleAddNewAddress = () => {
    router.push(`/select-location/map${returnTo !== '/home' ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`);
  };

  const visibleList = showAll ? locations : locations.slice(0, INITIAL_VISIBLE);
  const hasMore = locations.length > INITIAL_VISIBLE;

  return (
    <AppScreen title="Select Your Location" backHref={returnTo}>
      {/* Search */}
      <div className="relative mb-4">
        <AddressAutocompleteInput
          value={searchValue}
          onChange={(v) => setSearchValue(v)}
          placeholder="Search an area or address"
          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-3 pr-10 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 text-sm"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 pointer-events-none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </span>
      </div>
      {searchValue.trim() && (
        <button
          type="button"
          onClick={() => handleSearchSelect(searchValue)}
          className="mb-3 text-sm font-medium text-[#fe5001]"
        >
          Use this address
        </button>
      )}

      {/* Three cards */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#fe5001]/50 hover:bg-[#fe5001]/5 transition-colors"
        >
          <span className="w-10 h-10 rounded-full bg-[#fe5001]/10 flex items-center justify-center mb-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fe5001" strokeWidth="2" className="w-5 h-5">
              <circle cx="12" cy="12" r="3" />
              <circle cx="12" cy="12" r="8" />
            </svg>
          </span>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">
            Use Current Location
          </span>
        </button>
        <button
          type="button"
          onClick={handleAddNewAddress}
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#fe5001]/50 hover:bg-[#fe5001]/5 transition-colors"
        >
          <span className="w-10 h-10 rounded-lg border-2 border-[#fe5001] flex items-center justify-center mb-2">
            <svg viewBox="0 0 24 24" stroke="#fe5001" strokeWidth="2" className="w-5 h-5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">
            Add New Address
          </span>
        </button>
        <a
          href="https://wa.me/919876543210?text=Hi%2C%20please%20add%20my%20address"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-green-500/50 hover:bg-green-500/5 transition-colors"
        >
          <span className="w-10 h-10 flex items-center justify-center mb-2">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#25D366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </span>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">
            Request Address
          </span>
        </a>
      </div>

      {/* SAVED ADDRESSES */}
      <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
        Saved Addresses
      </h2>
      <div className="space-y-2">
        {visibleList.map((loc, i) => {
          const idx = i;
          const isSelected = selectedIndex === idx;
          return (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                isSelected
                  ? 'border-[#fe5001] bg-[#fe5001]/5 dark:bg-[#fe5001]/10'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}
            >
              <button
                type="button"
                onClick={() => handleSelect(idx)}
                className="flex-1 min-w-0 flex items-start gap-3 text-left"
              >
                <span className="shrink-0 w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <LocationIcon displayName={loc.displayName} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">— km</span>
                  <span className="block font-semibold text-slate-900 dark:text-slate-100 text-sm">{loc.displayName}</span>
                  <span className="block text-slate-600 dark:text-slate-400 text-xs truncate mt-0.5">
                    {loc.flatNo ? `${loc.flatNo}, ` : ''}{loc.address}
                  </span>
                </span>
              </button>
              <div className="relative shrink-0" ref={menuIndex === idx ? menuRef : undefined}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuIndex(menuIndex === idx ? null : idx);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
                  aria-label="Options"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>
                {menuIndex === idx && (
                  <div className="absolute right-0 top-full mt-1 w-44 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg py-1 z-20">
                    <button
                      type="button"
                      onClick={() => handleSetDefault(idx)}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Set as default
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 flex items-center gap-1 text-[#fe5001] font-medium text-sm"
        >
          View all
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </AppScreen>
  );
}
