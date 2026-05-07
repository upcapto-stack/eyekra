import type { SavedLocation } from '@/shared/utils/location';
import type { PrescriptionData } from '@/types/prescription';

export interface OrderItem {
  productId: string;
  productName: string;
  productPrice: string;
  lensId?: string;
  lensName?: string;
  lensPrice?: number;
  quantity: number;
  prescription?: PrescriptionData;
  /** Line total in INR (frame + lens) * quantity */
  lineTotal: number;
}

export interface Order {
  id: string;
  createdAt: string;
  /** Order journey: pending → confirmed → in_lab → qc → ready → shipped → delivered. cancelled at any time. */
  status: 'pending' | 'confirmed' | 'in_lab' | 'qc' | 'ready' | 'shipped' | 'delivered' | 'cancelled';
  customer: {
    name: string;
    mobile: string;
    email: string;
  };
  deliveryAddress: SavedLocation;
  items: OrderItem[];
  /** Sum of (frame + lens) * qty before discount */
  subtotal: number;
  /** Discount amount in INR */
  discount: number;
  /** Final amount in INR */
  total: number;
  /** Applied offer rule name/code if any */
  offerApplied?: string;
}
