/**
 * Eye test slot definitions.
 * TODO: Replace with API call to back office / admin panel.
 */

export interface EyeTestSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
}

/** Mock slots for now. Later: fetch from admin/back office by date */
const MOCK_SLOTS: EyeTestSlot[] = [
  { id: 's1', label: '9:00 AM - 10:00 AM', startTime: '09:00', endTime: '10:00' },
  { id: 's2', label: '10:00 AM - 11:00 AM', startTime: '10:00', endTime: '11:00' },
  { id: 's3', label: '11:00 AM - 12:00 PM', startTime: '11:00', endTime: '12:00' },
  { id: 's4', label: '12:00 PM - 1:00 PM', startTime: '12:00', endTime: '13:00' },
  { id: 's5', label: '2:00 PM - 3:00 PM', startTime: '14:00', endTime: '15:00' },
  { id: 's6', label: '3:00 PM - 4:00 PM', startTime: '15:00', endTime: '16:00' },
  { id: 's7', label: '4:00 PM - 5:00 PM', startTime: '16:00', endTime: '17:00' },
];

export function getSlotsForDate(_date: string): EyeTestSlot[] {
  // TODO: API - GET /api/eye-test/slots?date=YYYY-MM-DD
  return MOCK_SLOTS;
}
