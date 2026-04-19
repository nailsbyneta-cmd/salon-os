/**
 * Domain-level Zod schemas — shared zwischen Backend, Web-Frontend und
 * später Mobile. Jede API-Grenze validiert Input gegen diese Schemas
 * BEVOR die Service-Schicht läuft.
 */
import { z } from 'zod';
import { uuidSchema } from './index.js';

// ─── Enums ─────────────────────────────────────────────────────

export const staffRoleSchema = z.enum([
  'OWNER',
  'MANAGER',
  'FRONT_DESK',
  'STYLIST',
  'BOOTH_RENTER',
  'TRAINEE',
  'ASSISTANT',
]);
export type StaffRole = z.infer<typeof staffRoleSchema>;

export const appointmentStatusSchema = z.enum([
  'BOOKED',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_SERVICE',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'WAITLIST',
]);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const bookingChannelSchema = z.enum([
  'ONLINE_BRANDED',
  'ONLINE_WIDGET',
  'MARKETPLACE',
  'INSTAGRAM',
  'FACEBOOK',
  'GOOGLE_RESERVE',
  'TIKTOK',
  'WHATSAPP',
  'PHONE_AI',
  'PHONE_MANUAL',
  'SMS',
  'WALK_IN',
  'STAFF_INTERNAL',
]);
export type BookingChannel = z.infer<typeof bookingChannelSchema>;

export const genderSchema = z.enum(['FEMALE', 'MALE', 'NEUTRAL', 'KIDS']);
export type Gender = z.infer<typeof genderSchema>;

// ─── Client ────────────────────────────────────────────────────

export const clientAddressSchema = z
  .object({
    street: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    region: z.string().optional(),
    countryCode: z.string().length(2).toUpperCase().optional(),
  })
  .optional();

export const createClientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  birthday: z.string().date().optional(), // ISO 8601 YYYY-MM-DD
  pronouns: z.string().max(50).optional(),
  address: clientAddressSchema,
  language: z.string().max(10).optional(),
  marketingOptIn: z.boolean().default(false),
  smsOptIn: z.boolean().default(false),
  emailOptIn: z.boolean().default(false),
  allergies: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  preferredStaffId: uuidSchema.optional(),
  source: z.string().max(50).optional(),
  notesInternal: z.string().max(2000).optional(),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.partial();
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const clientSchema = createClientSchema.extend({
  id: uuidSchema,
  tenantId: uuidSchema,
  phoneE164: z.string().nullable().optional(),
  lifetimeValue: z.number().default(0),
  totalVisits: z.number().int().default(0),
  blocked: z.boolean().default(false),
  lastVisitAt: z.string().datetime({ offset: true }).nullable().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type Client = z.infer<typeof clientSchema>;

// ─── Service ───────────────────────────────────────────────────

export const createServiceSchema = z.object({
  categoryId: uuidSchema,
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  durationMinutes: z.number().int().min(5).max(600),
  bufferBeforeMin: z.number().int().min(0).max(120).default(0),
  bufferAfterMin: z.number().int().min(0).max(120).default(0),
  basePrice: z.number().min(0),
  taxClass: z.string().max(20).optional(),
  bookable: z.boolean().default(true),
  requiresConsult: z.boolean().default(false),
  requiresPatchTest: z.boolean().default(false),
  gender: genderSchema.optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  order: z.number().int().default(0),
  minDepositAmount: z.number().min(0).optional(),
  minDepositPct: z.number().min(0).max(100).optional(),
});
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = createServiceSchema.partial();
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

// ─── Appointment ───────────────────────────────────────────────

export const createAppointmentSchema = z
  .object({
    locationId: uuidSchema,
    clientId: uuidSchema.nullable().optional(),
    staffId: uuidSchema,
    roomId: uuidSchema.optional(),
    startAt: z.string().datetime({ offset: true }),
    endAt: z.string().datetime({ offset: true }),
    bookedVia: bookingChannelSchema.default('STAFF_INTERNAL'),
    notes: z.string().max(2000).optional(),
    internalNotes: z.string().max(2000).optional(),
    items: z
      .array(
        z.object({
          serviceId: uuidSchema,
          staffId: uuidSchema,
          price: z.number().min(0),
          duration: z.number().int().min(5),
          taxClass: z.string().max(20).optional(),
          notes: z.string().max(500).optional(),
        }),
      )
      .min(1)
      .max(20),
  })
  .refine((v) => new Date(v.endAt) > new Date(v.startAt), {
    message: 'endAt must be after startAt',
    path: ['endAt'],
  });
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const rescheduleAppointmentSchema = z
  .object({
    startAt: z.string().datetime({ offset: true }),
    endAt: z.string().datetime({ offset: true }),
    staffId: uuidSchema.optional(),
    roomId: uuidSchema.nullable().optional(),
  })
  .refine((v) => new Date(v.endAt) > new Date(v.startAt), {
    message: 'endAt must be after startAt',
    path: ['endAt'],
  });
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  reason: z.string().max(500).optional(),
  noShow: z.boolean().default(false),
});
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
