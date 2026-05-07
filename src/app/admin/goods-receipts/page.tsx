'use client';

import { useEffect, useState } from 'react';

export default function AdminGoodsReceiptsPage() {
  const [rows, setRows] = useState<unknown[]>([]);
  const [json, setJson] = useState(`{\n  "warehouseId": "",\n  "vendorInvoiceNo": "",\n  "lines": [\n    { "variantId": "", "qty": 1, "unitCost": 0 }\n  ]\n}`);

  const load = () => {
    void fetch('/api/admin/goods-receipts', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setRows(d.goodsReceipts ?? []));
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    try {
      const body = JSON.parse(json) as object;
      const res = await fetch('/api/admin/goods-receipts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const t = await res.json().catch(async () => ({ error: await res.text() }));
      if (!res.ok) alert((t as { error?: string }).error ?? 'Error');
      else {
        alert('GRN: ' + (t as { grnNumber?: string }).grnNumber);
        load();
      }
    } catch (e) {
      alert(String(e));
    }
  };

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Goods receipts (GRN)</h1>
      <p className="text-sm text-slate-500">POST JSON: warehouseId, optional poId, vendorInvoiceNo, lines[] with variantId or lensBlankId, qty, unitCost.</p>
      <textarea className="w-full h-48 font-mono text-xs border rounded p-2 dark:bg-slate-900" value={json} onChange={(e) => setJson(e.target.value)} />
      <button type="button" onClick={submit} className="px-4 py-2 rounded-lg bg-[#fe5001] text-white font-semibold text-sm">Post GRN</button>
      <h2 className="font-semibold text-slate-900 dark:text-white">Recent</h2>
      <pre className="text-xs bg-slate-100 dark:bg-slate-900 p-3 rounded-lg overflow-auto max-h-64">{JSON.stringify(rows, null, 2)}</pre>
    </div>
  );
}
