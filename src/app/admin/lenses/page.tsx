'use client';

import { useCallback, useEffect, useState } from 'react';

type Cat = { id: string; key: string; name: string };
type Blank = {
  id: string;
  categoryId: string;
  categoryKey: string;
  legacyLensId: string | null;
  name: string;
  shortDesc: string;
  description: string;
  whoIsItFor: string;
  lensType: string;
  blueCut: boolean;
  costPrice?: number;
  sellingPrice: number;
  taxRate: number;
  hsnCode: string;
  powerMin: number | null;
  powerMax: number | null;
  coating: string | null;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  lowStock?: boolean;
};

export default function AdminLensesPage() {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [blanks, setBlanks] = useState<Blank[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const [catForm, setCatForm] = useState({ key: '', name: '' });
  const [blankForm, setBlankForm] = useState({
    categoryId: '',
    legacyLensId: '',
    name: '',
    lensType: 'single_vision',
    shortDesc: '',
    description: '',
    whoIsItFor: '',
    costPrice: 0,
    sellingPrice: 0,
    blueCut: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, b] = await Promise.all([
        fetch('/api/admin/lens-categories', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/admin/lens-blanks', { credentials: 'include' }).then((r) => r.json()),
      ]);
      const cats = c.categories ?? [];
      setCategories(cats);
      setBlanks(b.lensBlanks ?? []);
      if (cats.length) {
        setBlankForm((f) => (f.categoryId ? f : { ...f, categoryId: cats[0].id }));
      }
    } catch {
      setMsg('Failed to load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addCategory = async () => {
    const res = await fetch('/api/admin/lens-categories', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: catForm.key, name: catForm.name }),
    });
    if (!res.ok) setMsg(await res.text());
    else {
      setCatForm({ key: '', name: '' });
      void load();
    }
  };

  const addBlank = async () => {
    const res = await fetch('/api/admin/lens-blanks', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId: blankForm.categoryId,
        legacyLensId: blankForm.legacyLensId || undefined,
        name: blankForm.name,
        lensType: blankForm.lensType,
        shortDesc: blankForm.shortDesc,
        description: blankForm.description,
        whoIsItFor: blankForm.whoIsItFor,
        costPrice: blankForm.costPrice,
        sellingPrice: blankForm.sellingPrice,
        blueCut: blankForm.blueCut,
        useCases: ['all'],
      }),
    });
    if (!res.ok) setMsg(await res.text());
    else void load();
  };

  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Lens blanks (lab SKUs)</h1>
      <p className="text-slate-500 text-sm">Cut-to-order inventory. Power range optional for generic service rows.</p>
      {msg && <p className="text-red-600 text-sm">{msg}</p>}

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 space-y-2">
        <h2 className="font-semibold">New category</h2>
        <div className="flex flex-wrap gap-2">
          <input placeholder="key e.g. single_vision" value={catForm.key} onChange={(e) => setCatForm((f) => ({ ...f, key: e.target.value }))} className="border rounded px-2 py-1 text-sm dark:bg-slate-900" />
          <input placeholder="Name" value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} className="border rounded px-2 py-1 text-sm dark:bg-slate-900" />
          <button type="button" onClick={addCategory} className="px-3 py-1 rounded bg-[#fe5001] text-white text-sm font-semibold">Add</button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 space-y-2">
        <h2 className="font-semibold">New lens blank</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <select value={blankForm.categoryId} onChange={(e) => setBlankForm((f) => ({ ...f, categoryId: e.target.value }))} className="border rounded px-2 py-1 dark:bg-slate-900">
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.key})</option>
            ))}
          </select>
          <input placeholder="Legacy storefront id (optional)" value={blankForm.legacyLensId} onChange={(e) => setBlankForm((f) => ({ ...f, legacyLensId: e.target.value }))} className="border rounded px-2 py-1 dark:bg-slate-900" />
          <input placeholder="Name" value={blankForm.name} onChange={(e) => setBlankForm((f) => ({ ...f, name: e.target.value }))} className="border rounded px-2 py-1 dark:bg-slate-900" />
          <input placeholder="lensType e.g. single_vision" value={blankForm.lensType} onChange={(e) => setBlankForm((f) => ({ ...f, lensType: e.target.value }))} className="border rounded px-2 py-1 dark:bg-slate-900" />
          <input placeholder="shortDesc" value={blankForm.shortDesc} onChange={(e) => setBlankForm((f) => ({ ...f, shortDesc: e.target.value }))} className="border rounded px-2 py-1 dark:bg-slate-900" />
          <input placeholder="description" value={blankForm.description} onChange={(e) => setBlankForm((f) => ({ ...f, description: e.target.value }))} className="border rounded px-2 py-1 dark:bg-slate-900" />
          <input placeholder="whoIsItFor" value={blankForm.whoIsItFor} onChange={(e) => setBlankForm((f) => ({ ...f, whoIsItFor: e.target.value }))} className="border rounded px-2 py-1 dark:bg-slate-900" />
          <label className="flex items-center gap-2"><input type="checkbox" checked={blankForm.blueCut} onChange={(e) => setBlankForm((f) => ({ ...f, blueCut: e.target.checked }))} /> Blue cut</label>
          <input type="number" placeholder="cost" value={blankForm.costPrice} onChange={(e) => setBlankForm((f) => ({ ...f, costPrice: Number(e.target.value) }))} className="border rounded px-2 py-1 dark:bg-slate-900" />
          <input type="number" placeholder="selling" value={blankForm.sellingPrice} onChange={(e) => setBlankForm((f) => ({ ...f, sellingPrice: Number(e.target.value) }))} className="border rounded px-2 py-1 dark:bg-slate-900" />
        </div>
        <button type="button" onClick={addBlank} className="px-4 py-2 rounded-lg bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-sm font-semibold">Create blank</button>
      </section>

      <div className="rounded-xl border overflow-hidden bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Category</th>
              <th className="text-left px-3 py-2">Sell</th>
              <th className="text-left px-3 py-2">Avail.</th>
            </tr>
          </thead>
          <tbody>
            {blanks.map((b) => (
              <tr key={b.id} className={`border-t border-slate-100 dark:border-slate-700 ${b.lowStock ? 'text-amber-700' : ''}`}>
                <td className="px-3 py-2">{b.name}</td>
                <td className="px-3 py-2">{b.categoryKey}</td>
                <td className="px-3 py-2">₹{b.sellingPrice}</td>
                <td className="px-3 py-2">{b.availableQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
