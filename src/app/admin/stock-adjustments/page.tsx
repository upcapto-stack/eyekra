'use client';

import { useState } from 'react';

export default function AdminStockAdjustmentsPage() {
  const [json, setJson] = useState(`{\n  "warehouseId": "",\n  "variantId": "",\n  "signedQty": 1,\n  "note": "count correction"\n}`);

  const submit = async () => {
    try {
      const body = JSON.parse(json) as object;
      const res = await fetch('/api/admin/stock-adjustments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      alert(res.ok ? 'OK' : await res.text());
    } catch (e) {
      alert(String(e));
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Stock adjustments</h1>
      <p className="text-sm text-slate-500">signedQty positive adds on-hand; negative subtracts. Use variantId or lensBlankId (exactly one).</p>
      <textarea className="w-full h-40 font-mono text-xs border rounded p-2 dark:bg-slate-900" value={json} onChange={(e) => setJson(e.target.value)} />
      <button type="button" onClick={submit} className="px-4 py-2 rounded-lg bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-semibold text-sm">Apply</button>
    </div>
  );
}
