import { BookingFieldStatus } from '@prisma/client';

const transitions: Record<BookingFieldStatus, BookingFieldStatus[]> = {
  [BookingFieldStatus.ASSIGNED]: [BookingFieldStatus.ACCEPTED, BookingFieldStatus.REJECTED],
  [BookingFieldStatus.ACCEPTED]: [BookingFieldStatus.EN_ROUTE, BookingFieldStatus.REJECTED],
  [BookingFieldStatus.EN_ROUTE]: [BookingFieldStatus.ARRIVED],
  [BookingFieldStatus.ARRIVED]: [BookingFieldStatus.OTP_VERIFIED],
  [BookingFieldStatus.OTP_VERIFIED]: [BookingFieldStatus.SESSION_ACTIVE],
  [BookingFieldStatus.SESSION_ACTIVE]: [BookingFieldStatus.COMPLETED],
  [BookingFieldStatus.COMPLETED]: [],
  [BookingFieldStatus.REJECTED]: [],
};

export function canTransitionBookingFieldStatus(
  current: BookingFieldStatus,
  next: BookingFieldStatus
): boolean {
  return transitions[current].includes(next);
}
