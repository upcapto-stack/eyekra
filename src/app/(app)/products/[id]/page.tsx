'use client';

import { useParams } from 'next/navigation';
import { ProductDetailView } from '@/modules/optical/components/ProductDetailView';

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return <ProductDetailView productId={id} />;
}
