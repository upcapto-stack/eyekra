'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearMockAuth, syncSessionUser } from '@/shared/utils/mock-auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || pathname === '/admin/login') {
      setAllowed(true);
      return;
    }
    void (async () => {
      const user = await syncSessionUser();
      if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
        router.replace('/admin/login');
        return;
      }
      setAllowed(true);
    })();
  }, [mounted, pathname, router]);

  if (!mounted || (!allowed && pathname !== '/admin/login')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
    clearMockAuth();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-900">
      <aside className="w-56 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <Link href="/admin" className="text-lg font-bold text-slate-900 dark:text-white">
            Eyekra Admin
          </Link>
        </div>
        <nav className="p-2 flex-1 space-y-1">
          <Link
            href="/admin"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname === '/admin' ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/admin/orders"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/admin/orders') ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Orders
          </Link>
          <Link
            href="/admin/bookings"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/admin/bookings') ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Bookings
          </Link>
          <Link
            href="/partner/bookings"
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Partner app
          </Link>
          <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Structure</p>
          <Link
            href="/admin/categories"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/admin/categories') ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Categories
          </Link>
          <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Data</p>
          <Link
            href="/admin/products"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/admin/products') ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Frames
          </Link>
          <Link
            href="/admin/lenses"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/admin/lenses') ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Lenses
          </Link>
          <Link
            href="/admin/attributes"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/admin/attributes') ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Attributes
          </Link>
          <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Marketing</p>
          <Link
            href="/admin/collections"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/admin/collections') ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Collections
          </Link>
          <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pricing</p>
          <Link
            href="/admin/offer-rules"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/admin/offer-rules') ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Offer rules
          </Link>
          <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Inventory</p>
          <Link
            href="/admin/warehouses"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/admin/warehouses') ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Warehouses
          </Link>
          <Link
            href="/admin/suppliers"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/admin/suppliers') ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Suppliers
          </Link>
          <Link
            href="/admin/purchase-orders"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/admin/purchase-orders') ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Purchase orders
          </Link>
          <Link
            href="/admin/goods-receipts"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/admin/goods-receipts') ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Goods receipts
          </Link>
          <Link
            href="/admin/stock-adjustments"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/admin/stock-adjustments') ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Stock adjustments
          </Link>
          <Link
            href="/admin/stock-units"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/admin/stock-units') ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Stock units (per piece)
          </Link>
          <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Display</p>
          <Link
            href="/admin/banners"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/admin/banners') ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Banners
          </Link>
          <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Settings</p>
          <Link
            href="/admin/cities"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/admin/cities') ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Cities
          </Link>
          <Link
            href="/admin/partner-warehouses"
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/admin/partner-warehouses') ? 'bg-[#fe5001]/10 text-[#fe5001]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Partner warehouses
          </Link>
        </nav>
        <div className="p-2 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
