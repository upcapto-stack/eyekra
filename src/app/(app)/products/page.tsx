'use client';

import { Suspense } from 'react';
import { ProductListingView } from '@/features/products';

function ProductsContent() {
  return <ProductListingView />;
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-900" />}>
      <ProductsContent />
    </Suspense>
  );
}
