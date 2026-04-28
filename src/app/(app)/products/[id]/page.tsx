'use client';

import { useParams } from 'next/navigation';
import { ProductDetailView } from '@/features/products/components/ProductDetailView';

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return <ProductDetailView productId={id} />;
}
