'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AppConfig } from '@/types/app-config';

const SECTIONS = [
  { title: 'Structure', desc: 'Navigation & primary grouping', links: [{ href: '/admin/categories', label: 'Categories' }] },
  { title: 'Data', desc: 'Products, lenses & attributes', links: [{ href: '/admin/products', label: 'Frames' }, { href: '/admin/lenses', label: 'Lenses' }, { href: '/admin/attributes', label: 'Attributes' }] },
  { title: 'Marketing', desc: 'Product groupings for campaigns', links: [{ href: '/admin/collections', label: 'Collections' }] },
  { title: 'Pricing', desc: 'Rule-based offers', links: [{ href: '/admin/offer-rules', label: 'Offer rules' }] },
  { title: 'Display', desc: 'Banners & links', links: [{ href: '/admin/banners', label: 'Banners' }] },
  { title: 'Settings', desc: 'App config', links: [{ href: '/admin/cities', label: 'Cities' }] },
];

function StatCard({
  title,
  value,
  sub,
  href,
  icon,
  accent,
}: {
  title: string;
  value: string | number;
  sub?: string;
  href?: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  const content = (
    <>
      <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-[#fe5001]/15 text-[#fe5001]' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
        <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 truncate">{value}</p>
        {sub != null && sub !== '' && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {href && (
        <span className="shrink-0 text-slate-400 dark:text-slate-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </span>
      )}
    </>
  );
  const className = `flex items-center gap-4 p-4 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 ${href ? 'hover:border-[#fe5001]/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors' : ''}`;
  if (href) {
    return <Link href={href} className={className}>{content}</Link>;
  }
  return <div className={className}>{content}</div>;
}

export default function AdminDashboardPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setConfig(data ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = config?.stats ?? {};
  const orderCount = stats.orderCount ?? 0;
  const customerCount = stats.customerCount ?? 0;
  const totalRevenue = stats.totalRevenue ?? 0;
  const productsCount = (config?.products != null && config.products.length > 0) ? config.products.length : 16;
  const lensesCount = (config?.lenses != null && config.lenses.length > 0) ? config.lenses.length : 7;
  const categoriesCount = config?.categories?.length ?? 0;
  const collectionsCount = config?.collections?.length ?? 0;
  const bannersCount = config?.banners?.length ?? 0;
  const offerRulesCount = config?.offerRules?.length ?? 0;
  const citiesCount = config?.eligibleCities?.length ?? 0;
  const attributesCount = config?.attributes?.length ?? 0;
  const tagsCount = config?.tags?.length ?? 0;

  const formatRevenue = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : n > 0 ? `₹${n}` : '—');

  if (loading) {
    return (
      <div className="max-w-4xl">
        <p className="text-slate-500 dark:text-slate-400">Loading stats…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Dashboard</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
        Pure app ke saare stats yahan dikhenge. Orders, customers aur config se counts.
      </p>

      {/* Primary stats: Orders, Customers, Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Orders"
          value={orderCount}
          sub="Total orders"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
          accent
        />
        <StatCard
          title="Customers"
          value={customerCount}
          sub="Registered / unique"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          accent
        />
        <StatCard
          title="Revenue"
          value={formatRevenue(totalRevenue)}
          sub="Total revenue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          accent
        />
      </div>

      {/* Catalog & config stats */}
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Catalog & config</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard title="Frames (products)" value={productsCount} href="/admin/products" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>} />
        <StatCard title="Lenses" value={lensesCount} href="/admin/lenses" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" strokeWidth={2} /><path strokeLinecap="round" strokeWidth={2} d="M12 2v2M12 20v2M2 12h2M20 12h2" /></svg>} />
        <StatCard title="Categories" value={categoriesCount} href="/admin/categories" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} />
        <StatCard title="Collections" value={collectionsCount} href="/admin/collections" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} />
        <StatCard title="Banners" value={bannersCount} href="/admin/banners" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
        <StatCard title="Offer rules" value={offerRulesCount} href="/admin/offer-rules" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>} />
        <StatCard title="Cities" value={citiesCount} href="/admin/cities" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
        <StatCard title="Attributes" value={attributesCount} href="/admin/attributes" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>} />
        <StatCard title="Tags" value={tagsCount} sub="Badges" href="/admin/attributes" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>} />
      </div>

      {/* Note for orders/customers */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-amber-800 dark:text-amber-200 text-sm mb-8">
        <p className="font-medium mb-1">Orders &amp; customers</p>
        <p>Orders, customers aur revenue abhi config se aate hain. Jab aap real orders/customers backend connect karoge, in values ko wahan se update karna (e.g. <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">config.stats</code> via API).</p>
      </div>

      {/* Quick links (existing sections) */}
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Quick links</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <div key={section.title} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{section.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{section.desc}</p>
            <ul className="space-y-1">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-[#fe5001] hover:underline font-medium">
                    {link.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
