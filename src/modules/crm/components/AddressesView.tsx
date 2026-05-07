'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppScreen } from '@/shared/components/layout/AppScreen';
import { getLocations, getSelectedIndex, setSelectedLocationIndex, type SavedLocation } from '@/shared/utils/location';

export function AddressesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromCheckout = searchParams.get('from') === 'checkout';
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [selectedIndex, setSelectedIdx] = useState(0);

  useEffect(() => {
    setLocations(getLocations());
    setSelectedIdx(getSelectedIndex());
  }, []);

  const handleSelect = (index: number) => {
    setSelectedLocationIndex(index);
    setSelectedIdx(index);
  };

  return (
    <AppScreen title="Manage addresses" backHref="/account" backToPrevious={fromCheckout}>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Your saved delivery addresses</p>
      <div className="space-y-3">
        {locations.map((loc, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSelect(i)}
            className={`w-full text-left p-4 rounded-xl border transition-colors ${
              selectedIndex === i
                ? 'border-[#fe5001] bg-[#fe5001]/5 dark:bg-[#fe5001]/10'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <p className="font-semibold text-slate-900 dark:text-slate-100">{loc.displayName}</p>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
              {loc.flatNo ? `${loc.flatNo}, ` : ''}{loc.address}
            </p>
            {selectedIndex === i && (
              <span className="inline-block mt-2 text-xs font-medium text-[#fe5001]">Default address</span>
            )}
          </button>
        ))}
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-xs mt-4">
        To add or edit addresses, go to Home and tap your location in the header.
      </p>
      {fromCheckout ? (
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 w-full flex justify-center items-center common-btn common-btn--primary"
        >
          Save
        </button>
      ) : (
        <Link href="/home" className="mt-4 w-full flex justify-center items-center common-btn common-btn--primary">
          Go to Home
        </Link>
      )}
    </AppScreen>
  );
}
