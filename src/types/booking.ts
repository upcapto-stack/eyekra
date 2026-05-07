import type { SavedLocation } from '@/shared/utils/location';

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
  /** Partner assigned for field visit (when set) */
  assignedPartnerId?: string | null;
  /** Partner app lifecycle: ASSIGNED, ACCEPTED, EN_ROUTE, … */
  fieldStatus?: string;
  assignedPartner?: {
    id: string;
    name: string;
    mobile: string;
    email: string | null;
  } | null;
}
