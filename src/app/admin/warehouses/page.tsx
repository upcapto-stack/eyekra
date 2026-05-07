'use client';

import { useEffect, useState } from 'react';

type W = {
  id: string;
  code: string;
  name: string;
  kind: string;
  city: string | null;
  state: string | null;
  isActive: boolean;
};

export default function AdminWarehousesPage() {
  const [list, setList] = useState<W[]>([]);
  const [form, setForm] = useState({ code: '', name: '', kind: 'BOTH', city: '', state: '' });

  const load = () => {
    void fetch('/api/admin/warehouses', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setList(d.warehouses ?? []));
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    await fetch('/api/admin/warehouses', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ code: '', name: '', kind: 'BOTH', city: '', state: '' });
    load();
  };

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Warehouses</h1>
      <div className="flex flex-wrap gap-2">
        <input className="border rounded px-2 py-1 text-sm dark:bg-slate-800" placeholder="CODE" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
        <input className="border rounded px-2 py-1 text-sm dark:bg-slate-800" placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <select className="border rounded px-2 py-1 text-sm dark:bg-slate-800" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
          <option value="BOTH">BOTH</option>
          <option value="WAREHOUSE">WAREHOUSE</option>
          <option value="LAB">LAB</option>
        </select>
        <input className="border rounded px-2 py-1 text-sm dark:bg-slate-800" placeholder="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
        <input className="border rounded px-2 py-1 text-sm dark:bg-slate-800" placeholder="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
        <button type="button" onClick={add} className="px-3 py-1 rounded bg-[#fe5001] text-white text-sm font-semibold">Add</button>
      </div>
      <ul className="space-y-2">
        {list.map((w) => (
          <li key={w.id} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm flex justify-between bg-white dark:bg-slate-800">
            <span><strong>{w.code}</strong> — {w.name} ({w.kind})</span>
            <span className="text-slate-500">{w.city}, {w.state}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
