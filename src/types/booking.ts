import type { SavedLocation } from '@/lib/location';

export interface EyeTestBooking {
  id: string;
  createdAt: string;
  /** Journey: pending → confirmed → scheduled → out_for_visit → optometrist_reached → completed. cancelled at any time. */
  status: 'pending' | 'confirmed' | 'scheduled' | 'out_for_visit' | 'optometrist_reached' | 'completed' | 'cancelled';
  customer: {
    name: string;
    mobile: string;
    email: string;
  };
  address: string;
  /** Saved location snapshot (displayName, flatNo, address, contact) */
  deliveryAddress?: SavedLocation;
  preferredDate: string;
  preferredSlotId: string;
  slotLabel?: string;
  /** Amount in INR (e.g. 99 per person) */
  amount: number;
  /** Additional family members for same test */
  patients?: { name: string; mobile: string }[];
  /** Home try-on frame IDs if any */
  tryonFrameIds?: string[];
}
