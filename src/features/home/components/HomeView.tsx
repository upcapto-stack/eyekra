'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import { getMockUser, clearMockAuth } from '@/lib/mock-auth';
import { getLocation, DEFAULT_LOCATION, type SavedLocation } from '@/lib/location';
import type { AppConfig, HomeBanner } from '@/types/app-config';

const TOP_CATEGORIES = [
  { id: 'eyeglasses', label: 'Eyeglasses' },
  { id: 'sunglasses', label: 'Sunglasses' },
  { id: 'reading', label: 'Reading Glasses' },
  { id: 'computer', label: 'Computer Glasses' },
  { id: 'kids', label: 'Kids Glasses' },
] as const;

function CategoryIcon({ type }: { type: string }) {
  const className = 'w-8 h-8 text-slate-600 dark:text-slate-300';
  const stroke = 1.5;
  const round = 'round';
  switch (type) {
    case 'eyeglasses':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
          <circle cx="7" cy="12" r="4" />
          <circle cx="17" cy="12" r="4" />
          <path d="M11 12h2" />
          <path d="M7 12l-2 .5" />
          <path d="M17 12l2 .5" />
        </svg>
      );
    case 'sunglasses':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
          <path d="M3 12c0-2 1-4 3-4s3 2 3 4" />
          <path d="M21 12c0-2-1-4-3-4s-3 2-3 4" />
          <path d="M9 12h6" />
          <path d="M3 12v1a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
          <path d="M8 10h8" />
        </svg>
      );
    case 'reading':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
          <circle cx="7" cy="12" r="3.5" />
          <circle cx="17" cy="12" r="3.5" />
          <path d="M10.5 12h3" />
          <path d="M7 12l-2 .5" />
          <path d="M17 12l2 .5" />
          <path d="M12 15v3l-2-1 2-1" />
        </svg>
      );
    case 'computer':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
          <circle cx="7" cy="11" r="3" />
          <circle cx="17" cy="11" r="3" />
          <path d="M10 11h4" />
          <path d="M7 11l-2 .5" />
          <path d="M17 11l2 .5" />
          <rect x="4" y="17" width="16" height="2" rx="1" />
          <path d="M8 17v1" />
          <path d="M16 17v1" />
        </svg>
      );
    case 'kids':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
          <circle cx="7" cy="11" r="3" />
          <circle cx="17" cy="11" r="3" />
          <path d="M10 11h4" />
          <path d="M7 11l-1.5 .5" />
          <path d="M17 11l1.5 .5" />
          <path d="M12 13v2" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
          <circle cx="7" cy="12" r="4" />
          <circle cx="17" cy="12" r="4" />
          <path d="M11 12h2" />
          <path d="M7 12l-2 .5" />
          <path d="M17 12l2 .5" />
        </svg>
      );
  }
}

const FRAME_SHAPES = [
  { id: 'round', label: 'Round' },
  { id: 'oval', label: 'Oval' },
  { id: 'square', label: 'Square' },
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'aviator', label: 'Aviator' },
  { id: 'cat-eye', label: 'Cat-Eye' },
  { id: 'wayfarer', label: 'Wayfarer' },
  { id: 'geometric', label: 'Geometric' },
  { id: 'clubmaster', label: 'Clubmaster' },
] as const;

function FrameShapeIcon({ shape }: { shape: (typeof FRAME_SHAPES)[number]['id'] }) {
  const className = 'w-10 h-10 text-slate-700 dark:text-slate-200';
  const stroke = 1.5;
  const round = 'round';
  switch (shape) {
    case 'round':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
          <circle cx="6" cy="12" r="4" />
          <circle cx="18" cy="12" r="4" />
          <path d="M10 12h4" />
          <path d="M6 12H3" />
          <path d="M18 12h3" />
        </svg>
      );
    case 'oval':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
          <ellipse cx="6" cy="12" rx="3.5" ry="4" />
          <ellipse cx="18" cy="12" rx="3.5" ry="4" />
          <path d="M9.5 12h5" />
          <path d="M6 12H3" />
          <path d="M18 12h3" />
        </svg>
      );
    case 'square':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
          <rect x="2" y="8" width="6" height="6" rx="0.5" />
          <rect x="16" y="8" width="6" height="6" rx="0.5" />
          <path d="M8 11h8" />
          <path d="M2 11H0" />
          <path d="M24 11h-2" />
        </svg>
      );
    case 'rectangle':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
          <rect x="2" y="7" width="6" height="8" rx="0.5" />
          <rect x="16" y="7" width="6" height="8" rx="0.5" />
          <path d="M8 11h8" />
          <path d="M2 11H0" />
          <path d="M24 11h-2" />
        </svg>
      );
    case 'aviator':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
          <path d="M4 12c0-2 2-4 4-4s4 2 4 4" />
          <path d="M20 12c0-2-2-4-4-4s-4 2-4 4" />
          <path d="M12 12v2" />
          <path d="M8 12H4" />
          <path d="M16 12h4" />
          <path d="M12 14a2 2 0 0 0 0 4" />
        </svg>
      );
    case 'cat-eye':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
          <path d="M4 8v4c0 1.5 1 2.5 2.5 2.5S9 13.5 9 12V8" />
          <path d="M15 8v4c0 1.5 1 2.5 2.5 2.5s2.5-1 2.5-2.5V8" />
          <path d="M9.5 11h5" />
          <path d="M9 10H5" />
          <path d="M15 10h4" />
        </svg>
      );
    case 'wayfarer':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
          <path d="M4 9v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" />
          <path d="M4 9h3l2 3 2-3h3" />
          <path d="M11 12h2" />
          <path d="M4 10H2" />
          <path d="M22 10h-2" />
        </svg>
      );
    case 'geometric':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
          <path d="M5 9l2 3 1-3h2l1 3 2-3" />
          <path d="M17 9l2 3 1-3" />
          <path d="M11 11h2" />
          <path d="M7 10H4" />
          <path d="M20 10h-3" />
        </svg>
      );
    case 'clubmaster':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={round} className={className}>
          <circle cx="7" cy="12" r="3.5" />
          <circle cx="17" cy="12" r="3.5" />
          <path d="M10.5 12h3" />
          <path d="M7 12l-2 .5" />
          <path d="M17 12l2 .5" />
          <path d="M7 8v1" />
          <path d="M17 8v1" />
        </svg>
      );
    default:
      return null;
  }
}

const TRENDY_FRAMES = [
  { id: '1', name: 'Classic Aviator', discount: '30% OFF', price: 'From ₹2,499' },
  { id: '2', name: 'Round Metal', discount: '25% OFF', price: 'From ₹1,899' },
  { id: '3', name: 'Wayfarer', discount: '40% OFF', price: 'From ₹2,199' },
  { id: '4', name: 'Cat-Eye', discount: '20% OFF', price: 'From ₹1,699' },
  { id: '5', name: 'Rectangle', discount: '35% OFF', price: 'From ₹1,999' },
];

const BANNER_AUTO_SCROLL_MS = 4000;

const DEFAULT_BANNERS: HomeBanner[] = [
  { id: '1', tag: 'Eyekra Frame Fest', title: 'UP TO 40% OFF', sub: 'Grab big discounts on trending frames', extra: '+ Free home trial', gradient: 'from-violet-600 to-purple-700', link: '/home', showOnlyInEligibleCities: false, sortOrder: 0 },
  { id: '2', tag: 'New Arrivals', title: 'FRESH STYLES', sub: 'Latest frames just landed', extra: 'Shop the new collection', gradient: 'from-[#fe5001] to-[#e54800]', link: '/home', showOnlyInEligibleCities: false, sortOrder: 1 },
];

export function HomeView() {
  const router = useRouter();
  const [savedLocation, setSavedLocation] = useState<SavedLocation>(DEFAULT_LOCATION);
  useEffect(() => {
    setSavedLocation(getLocation());
  }, []);
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setConfig(data))
      .catch(() => {});
  }, []);

  const addressStr = [savedLocation.flatNo, savedLocation.address].filter(Boolean).join(' ').toLowerCase();
  const eligibleCities = config?.eligibleCities ?? [];
  const isEligible = eligibleCities.length > 0 && eligibleCities.some((city) => addressStr.includes(city.toLowerCase()));
  const allBanners = (config?.banners ?? DEFAULT_BANNERS).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const visibleBanners = isEligible ? allBanners : allBanners.filter((b) => !b.showOnlyInEligibleCities);
  const topCategories = (config?.categories && config.categories.length > 0)
    ? config.categories.filter((c) => !c.parentId).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    : TOP_CATEGORIES.map((c, i) => ({ id: c.id, label: c.label, sortOrder: i, iconUrl: undefined as string | undefined }));
  const fourHourBanner = allBanners.find(
    (b) => b.showOnlyInEligibleCities && (b.id === '4' || /4hr|express|delivery/i.test([b.tag ?? '', b.title ?? ''].join(' ')))
  );
  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    const onFocus = () => setSavedLocation(getLocation());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    setBannerIndex((i) => Math.min(i, Math.max(0, visibleBanners.length - 1)));
  }, [visibleBanners.length]);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showProfileMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showProfileMenu]);

  useEffect(() => {
    if (visibleBanners.length === 0) return;
    const t = setInterval(() => {
      setBannerIndex((i) => (i + 1) % visibleBanners.length);
    }, BANNER_AUTO_SCROLL_MS);
    return () => clearInterval(t);
  }, [visibleBanners.length]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900 pb-20">
      {/* Header: Logo | Address (Swiggy-style) | Profile icon */}
      <header className="safe-top sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 py-2.5 flex items-center gap-2">
        <Link href="/home" className="flex shrink-0">
          <Image
            src="/eyekra-login-logo.png"
            alt="eyekra"
            width={88}
            height={88}
            className="object-contain w-auto h-8"
            style={{ width: 'auto', height: '2rem' }}
            priority
          />
        </Link>
        <form action="/select-location" method="get" className="flex-1 min-w-0">
          <button
            type="submit"
            className="flex items-center gap-1.5 min-w-0 w-full text-left py-1.5 bg-transparent border-0 p-0 cursor-pointer text-inherit font-inherit"
            aria-label="Change location"
          >
            <span className="shrink-0 w-5 h-5 flex items-center justify-center text-slate-600 dark:text-slate-400" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{savedLocation.displayName}</span>
              <span className="block text-slate-500 dark:text-slate-400 text-xs truncate">
                {savedLocation.flatNo ? `${savedLocation.flatNo}, ${savedLocation.address}` : savedLocation.address}
              </span>
            </span>
            <span className="shrink-0 text-slate-400 dark:text-slate-500" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>
        </form>
        <div className="relative shrink-0" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu((v) => !v)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Profile"
            aria-expanded={showProfileMenu}
            aria-haspopup="true"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
          {showProfileMenu && (
            <div
              className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg py-2 z-30"
              role="menu"
            >
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                  {getMockUser().name || 'Account'}
                </p>
                {getMockUser().mobile && (
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{getMockUser().mobile}</p>
                )}
              </div>
              <Link
                href="/account"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileMenu(false);
                }}
              >
                <span className="w-5 h-5 flex items-center justify-center text-slate-400 shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                My account
              </Link>
              <button
                type="button"
                  onClick={async () => {
                    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
                  clearMockAuth();
                  setShowProfileMenu(false);
                  router.replace('/login');
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                role="menuitem"
              >
                <span className="w-5 h-5 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </span>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-3 pt-3 pb-6">
        {/* 4hr delivery banner - only in eligible cities, above hero cards */}
        {isEligible && fourHourBanner && (
          <section className="mb-3" aria-label="Express delivery">
            <Link
              href={fourHourBanner.link || '/products'}
              className={`block rounded-2xl bg-gradient-to-r ${fourHourBanner.gradient || 'from-amber-500 to-orange-600'} p-4 text-white`}
            >
              <p className="text-white/90 text-xs font-medium uppercase tracking-wide">{fourHourBanner.tag}</p>
              <p className="text-lg font-bold mt-0.5">{fourHourBanner.title}</p>
              <p className="text-white/90 text-sm mt-0.5">{fourHourBanner.sub}</p>
              {fourHourBanner.extra && <p className="text-amber-100 text-xs mt-1">{fourHourBanner.extra}</p>}
            </Link>
          </section>
        )}

        {/* Two big hero cards - Trendy Frame Arrivals | Home Eye Test (only in eligible cities) or Explore Frames */}
        <section className="grid grid-cols-2 gap-2 mb-4" aria-label="Quick access">
          <Link
            href="/products?collection=new-arrivals"
            className="relative flex flex-col rounded-2xl overflow-hidden min-h-[140px] p-4 bg-gradient-to-br from-[#fe5001] to-[#e54800] text-white"
          >
            <h3 className="text-lg font-bold leading-tight">Trendy Frame Arrivals</h3>
            <p className="text-white/90 text-xs mt-1">Latest styles delivered</p>
            <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white text-lg">→</span>
            </div>
          </Link>
          {isEligible ? (
            <Link
              href="/home-eye-test"
              className="relative flex flex-col rounded-2xl overflow-hidden min-h-[140px] p-4 bg-gradient-to-br from-rose-500 to-pink-600 text-white"
            >
              <h3 className="text-lg font-bold leading-tight">Home Eye Test</h3>
              <p className="text-white/90 text-xs mt-1">Book at your doorstep</p>
              <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-white text-lg">→</span>
              </div>
            </Link>
          ) : (
            <Link
              href="/products"
              className="relative flex flex-col rounded-2xl overflow-hidden min-h-[140px] p-4 bg-gradient-to-br from-violet-600 to-indigo-700 text-white"
            >
              <h3 className="text-lg font-bold leading-tight">Explore Frames</h3>
              <p className="text-white/90 text-xs mt-1">Find your perfect pair</p>
              <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-white text-lg">→</span>
              </div>
            </Link>
          )}
        </section>

        {/* Banners - from admin config; location-based visibility */}
        {visibleBanners.length > 0 && (
        <section className="overflow-hidden rounded-2xl mb-4" aria-label="Offers">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{
              width: `${visibleBanners.length * 100}%`,
              transform: `translateX(-${bannerIndex * (100 / visibleBanners.length)}%)`,
            }}
          >
            {visibleBanners.map((b) => {
              const bannerOfferRule = b.offerRuleId && config?.offerRules?.find((r) => r.id === b.offerRuleId);
              const ruleCode = bannerOfferRule && typeof (bannerOfferRule as { code?: string }).code === 'string' ? (bannerOfferRule as { code: string }).code.trim() : '';
              const useCode = ruleCode || undefined;
              return (
              <Link
                key={b.id}
                href={b.link || '/home'}
                className="shrink-0 rounded-2xl overflow-hidden px-0.5"
                style={{ width: `${100 / visibleBanners.length}%` }}
              >
                {b.imageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-700" style={{ aspectRatio: b.aspectRatio || '3/2' }}>
                    <Image
                      src={b.imageUrl}
                      alt={b.tag}
                      fill
                      sizes="(max-width: 768px) 100vw, 640px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-black/60 to-transparent text-white">
                      <p className={`${b.tagSize || 'text-xs'} font-medium uppercase opacity-90`}>{b.tag}</p>
                      <p className={`${b.titleSize || 'text-lg'} font-bold`}>{b.title}</p>
                      {b.sub && <p className={`${b.subSize || 'text-sm'} opacity-90`}>{b.sub}</p>}
                      {useCode && <p className="text-xs font-mono mt-1 text-amber-200">Use code {useCode}</p>}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`rounded-2xl p-5 min-h-[140px] ${b.gradient ? `bg-gradient-to-r ${b.gradient}` : b.backgroundColor ? '' : 'bg-gradient-to-r from-slate-600 to-slate-700'}`}
                    style={b.backgroundColor && !b.gradient ? { backgroundColor: b.backgroundColor } : undefined}
                  >
                    <p className={`${b.tagSize || 'text-xs'} ${b.textColor || 'text-white/90'} font-medium uppercase tracking-wide`}>{b.tag}</p>
                    <p className={`${b.titleSize || 'text-2xl'} ${b.textColor || 'text-white'} font-bold mt-1`}>{b.title}</p>
                    <p className={`${b.subSize || 'text-sm'} ${b.textColor || 'text-white/90'} mt-1`}>{b.sub}</p>
                    {b.extra && <p className={`${b.extraSize || 'text-xs'} ${b.textColor === 'text-slate-900' ? 'text-amber-600' : 'text-amber-200'} mt-2`}>{b.extra}</p>}
                    {useCode && <p className="text-xs font-mono mt-1 text-amber-200">Use code {useCode}</p>}
                  </div>
                )}
              </Link>
            ); })}
          </div>
          <div className="flex justify-center gap-1.5 mt-2">
            {visibleBanners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setBannerIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === bannerIndex ? 'w-5 bg-[#fe5001]' : 'w-1.5 bg-slate-300 dark:bg-slate-600'
                }`}
                aria-label={`Go to banner ${i + 1}`}
              />
            ))}
          </div>
        </section>
        )}

        {/* Top Categories */}
        <section className="mb-5" aria-label="Top Categories">
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold mb-3 px-1">
            Top Categories
          </h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 pb-1">
            {topCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.id}`}
                className="shrink-0 flex flex-col items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-4 min-w-[88px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600"
              >
                <span className="mb-2 flex items-center justify-center w-10 h-10">
                  {cat.iconUrl ? (
                    <Image src={cat.iconUrl} alt="" width={40} height={40} className="w-10 h-10 object-contain" />
                  ) : (
                    <CategoryIcon type={cat.id} />
                  )}
                </span>
                <span className="text-slate-900 dark:text-slate-100 text-xs font-semibold text-center leading-tight">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Top Sellers - horizontal scroll (like Restaurants You Love) */}
        <section className="mb-5" aria-label="Top Sellers">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold">
              Top Sellers
            </h2>
            <Link href="/products?collection=top-sellers" className="text-[#fe5001] text-sm font-semibold">
              See all
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 pb-2">
            {TRENDY_FRAMES.map((frame) => (
              <Link
                key={frame.id}
                href={`/products/${frame.id}`}
                className="shrink-0 w-[140px] rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center relative">
                  <span className="absolute top-2 left-2 bg-[#fe5001] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    {frame.discount}
                  </span>
                </div>
                <div className="p-2">
                  <p className="text-slate-900 dark:text-slate-100 font-semibold text-sm truncate">{frame.name}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{frame.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Face shape & frame fit banner */}
        <section className="mb-5" aria-label="Find your frame">
          <Link
            href="/home"
            className="block rounded-2xl overflow-hidden bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-700 dark:to-slate-800 p-5 text-white border border-slate-600 dark:border-slate-600"
          >
            <p className="text-white font-bold text-lg">Know your face shape</p>
            <p className="text-slate-200 text-sm mt-1">Discover frame shapes that suit your face</p>
            <span className="inline-block mt-3 text-sm font-semibold text-[#fe5001]">Find your fit →</span>
          </Link>
        </section>

        {/* Choose eyeglasses by frame shape */}
        <section className="mb-5" aria-label="Frame shapes">
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold mb-3 px-1">
            Choose by frame shape
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 px-1">
            Pick the shape that suits your face
          </p>
          <div className="grid grid-cols-3 gap-3">
            {FRAME_SHAPES.map((shape) => (
              <Link
                key={shape.id}
                href={`/products?shape=${shape.id}`}
                className="flex flex-col items-center rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 hover:border-[#fe5001] hover:shadow-md transition-all"
              >
                <span className="mb-2 flex items-center justify-center w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700">
                  <FrameShapeIcon shape={shape.id} />
                </span>
                <span className="text-slate-900 dark:text-slate-100 text-xs font-semibold text-center">
                  {shape.label}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

