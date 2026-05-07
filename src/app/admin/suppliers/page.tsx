'use client';

import { useEffect, useState } from 'react';

type S = { id: string; name: string; gstin: string | null; isActive: boolean };

export default function AdminSuppliersPage() {
  const [list, setList] = useState<S[]>([]);
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');

  const load = () => {
    void fetch('/api/admin/suppliers', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setList(d.suppliers ?? []));
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    await fetch('/api/admin/suppliers', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, gstin: gstin || undefined }),
    });
    setName('');
    setGstin('');
    load();
  };

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Suppliers</h1>
      <div className="flex gap-2">
        <input className="border rounded px-2 py-1 flex-1 dark:bg-slate-800" placeholder="Supplier name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="border rounded px-2 py-1 w-40 dark:bg-slate-800" placeholder="GSTIN" value={gstin} onChange={(e) => setGstin(e.target.value)} />
        <button type="button" onClick={add} className="px-3 py-1 rounded bg-[#fe5001] text-white text-sm font-semibold">Add</button>
      </div>
      <ul className="space-y-1 text-sm">
        {list.map((s) => (
          <li key={s.id} className="border rounded px-3 py-2 bg-white dark:bg-slate-800">{s.name} {s.gstin && <span className="text-slate-500">({s.gstin})</span>}</li>
        ))}
      </ul>
    </div>
  );
}
