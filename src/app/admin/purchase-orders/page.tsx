'use client';

import { useEffect, useState } from 'react';

export default function AdminPurchaseOrdersPage() {
  const [pos, setPos] = useState<unknown[]>([]);
  const load = () => {
    void fetch('/api/admin/purchase-orders', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setPos(d.purchaseOrders ?? []));
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Purchase orders</h1>
      <p className="text-sm text-slate-500 mb-4">Create POs via API or extend this UI. Listed below (latest 100).</p>
      <pre className="text-xs bg-slate-100 dark:bg-slate-900 p-3 rounded-lg overflow-auto max-h-[480px]">{JSON.stringify(pos, null, 2)}</pre>
    </div>
  );
}
