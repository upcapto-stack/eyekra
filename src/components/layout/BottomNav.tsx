'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCartCount } from '@/lib/cart';

const navItems = [
  { href: '/home', label: 'Home', Icon: HomeIcon },
  { href: '/products', label: 'Explore', Icon: ExploreIcon },
  { href: '/cart', label: 'Cart', Icon: CartIcon, showBadge: true },
  { href: '/account', label: 'Account', Icon: AccountIcon },
] as const;

function HomeIcon({ active }: { active: boolean }) {
  const className = active ? 'text-[#fe5001]' : 'text-slate-500 dark:text-slate-400';
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={`w-6 h-6 ${className}`}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ExploreIcon({ active }: { active: boolean }) {
  const className = active ? 'text-[#fe5001]' : 'text-slate-500 dark:text-slate-400';
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={`w-6 h-6 ${className}`}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function CartIcon({ active }: { active: boolean }) {
  const className = active ? 'text-[#fe5001]' : 'text-slate-500 dark:text-slate-400';
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={`w-6 h-6 ${className}`}>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function AccountIcon({ active }: { active: boolean }) {
  const className = active ? 'text-[#fe5001]' : 'text-slate-500 dark:text-slate-400';
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={`w-6 h-6 ${className}`}>
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setCartCount(getCartCount());
  }, [pathname]);

  const isAccountSection =
    pathname === '/account' ||
    pathname.startsWith('/account') ||
    pathname === '/orders' ||
    pathname.startsWith('/orders') ||
    pathname === '/bookings' ||
    pathname.startsWith('/bookings') ||
    pathname === '/wallet' ||
    pathname === '/rewards' ||
    pathname === '/favourites' ||
    pathname === '/addresses' ||
    pathname === '/settings' ||
    pathname === '/about' ||
    pathname === '/help';

  return (
    <nav
      className="safe-bottom fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-around items-center py-2.5 px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)]"
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const { href, label, Icon } = item;
        const showBadge = 'showBadge' in item ? item.showBadge : false;
        const isActive =
          (label === 'Home' && pathname === '/home') ||
          (label === 'Explore' && (pathname === '/products' || pathname.startsWith('/products'))) ||
          (label === 'Cart' && pathname === '/cart') ||
          (label === 'Account' && (pathname === '/account' || isAccountSection));
        return (
          <Link
            key={label}
            href={href}
            className={`flex flex-col items-center gap-1 min-w-[64px] py-2 px-3 rounded-xl transition-all duration-200 ${
              isActive
                ? 'text-[#fe5001] bg-[#fe5001]/10 dark:bg-[#fe5001]/15'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="relative inline-flex items-center justify-center">
              <Icon active={isActive} />
              {showBadge && cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] rounded-full bg-[#fe5001] text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </span>
            <span className="text-[11px] font-semibold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
