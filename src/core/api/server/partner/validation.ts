import { z } from 'zod';

export const geoSchema = z
  .object({
    lat: z.number().finite(),
    lng: z.number().finite(),
  })
  .strict();

export const punchInSchema = z
  .object({
    deviceId: z.string().trim().min(1),
    selfieUrl: z.string().trim().min(1),
    liveness: z.boolean().optional().default(false),
    previewOnly: z.boolean().optional().default(false),
    geo: geoSchema.optional(),
    equipmentChecklist: z.array(z.string()).optional().default([]),
  })
  .strict();

export const punchOutSchema = z
  .object({
    selfieUrl: z.string().trim().min(1),
    liveness: z.boolean().optional().default(false),
    previewOnly: z.boolean().optional().default(false),
    geo: geoSchema.optional(),
    returnChecklist: z.array(z.string()).optional().default([]),
  })
  .strict();

export const equipmentActionSchema = z
  .object({
    equipmentId: z.string().trim().min(1),
    checklist: z.array(z.string()).optional().default([]),
  })
  .strict();

export const equipmentDamageSchema = z
  .object({
    equipmentId: z.string().trim().min(1),
    photoUrl: z.string().trim().optional(),
    note: z.string().trim().min(3),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
  })
  .strict();

export const bookingStatusUpdateSchema = z
  .object({
    status: z.string().trim().min(1),
    note: z.string().trim().optional(),
  })
  .strict();

export const verifyOtpSchema = z
  .object({
    otp: z.string().trim().regex(/^\d{6}$/),
  })
  .strict();

export const trackingStartSchema = z
  .object({
    bookingId: z.string().trim().min(1),
    gpsPath: z.array(z.any()).optional().default([]),
  })
  .strict();

export const trackingStopSchema = z
  .object({
    bookingId: z.string().trim().min(1),
    gpsPath: z.array(z.any()).optional().default([]),
    audioUrl: z.string().trim().optional(),
  })
  .strict();

export const eyeTestSaveStepSchema = z
  .object({
    bookingId: z.string().trim().min(1),
    step: z.string().trim().min(1),
    payload: z.any().optional().default({}),
  })
  .strict();

export const eyeTestSubmitSchema = z
  .object({
    bookingId: z.string().trim().min(1),
  })
  .strict();

export const partnerOrderSchema = z
  .object({
    userId: z.string().trim().min(1),
    bookingId: z.string().trim().optional(),
    items: z.array(z.any()).min(1),
    deliveryAddress: z.any(),
    subtotal: z.number().finite().nonnegative(),
    discount: z.number().finite().nonnegative().optional().default(0),
    total: z.number().finite().nonnegative(),
    offerApplied: z.string().trim().optional(),
  })
  .strict();
