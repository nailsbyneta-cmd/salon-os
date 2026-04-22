/**
 * Domain-level Zod schemas — shared zwischen Backend, Web-Frontend und
 * später Mobile. Jede API-Grenze validiert Input gegen diese Schemas
 * BEVOR die Service-Schicht läuft.
 */
import { z } from 'zod';
import { uuidSchema, currencyCodeSchema } from './primitives.js';

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
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  birthday: z.string().date().nullable().optional(), // ISO 8601 YYYY-MM-DD
  pronouns: z.string().max(50).nullable().optional(),
  address: clientAddressSchema,
  language: z.string().max(10).optional(),
  marketingOptIn: z.boolean().default(false),
  smsOptIn: z.boolean().default(false),
  emailOptIn: z.boolean().default(false),
  allergies: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  preferredStaffId: uuidSchema.nullable().optional(),
  source: z.string().max(50).nullable().optional(),
  notesInternal: z.string().max(2000).nullable().optional(),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.partial().extend({
  blocked: z.boolean().optional(),
});
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const importClientsSchema = z.object({
  clients: z.array(createClientSchema).min(1).max(5000),
});
export type ImportClientsInput = z.infer<typeof importClientsSchema>;

export const importClientsResultSchema = z.object({
  created: z.number().int(),
  skipped: z.number().int(),
  errors: z.array(
    z.object({ row: z.number().int(), message: z.string() }),
  ),
});
export type ImportClientsResult = z.infer<typeof importClientsResultSchema>;

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
  notifyClient: z.boolean().default(true),
});
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

// ─── Location ──────────────────────────────────────────────────

const openingHoursDaySchema = z.array(
  z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/, 'HH:mm'),
    close: z.string().regex(/^\d{2}:\d{2}$/, 'HH:mm'),
  }),
);

export const openingHoursSchema = z.object({
  mon: openingHoursDaySchema,
  tue: openingHoursDaySchema,
  wed: openingHoursDaySchema,
  thu: openingHoursDaySchema,
  fri: openingHoursDaySchema,
  sat: openingHoursDaySchema,
  sun: openingHoursDaySchema,
});

export const createLocationSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  address1: z.string().max(200).optional(),
  address2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  region: z.string().max(100).optional(),
  countryCode: z.string().length(2).toUpperCase(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  timezone: z.string().min(1),
  currency: currencyCodeSchema,
  taxConfig: z.object({
    vatRate: z.number().min(0).max(100),
    vatId: z.string().nullable().optional(),
  }),
  openingHours: openingHoursSchema,
  publicProfile: z.boolean().default(true),
  marketplaceListed: z.boolean().default(false),
});
export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = createLocationSchema.partial();
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

// ─── Room ──────────────────────────────────────────────────────

export const createRoomSchema = z.object({
  locationId: uuidSchema,
  name: z.string().min(1).max(100),
  capacity: z.number().int().min(1).max(10).default(1),
  features: z.array(z.string().max(50)).default([]),
  active: z.boolean().default(true),
});
export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const updateRoomSchema = createRoomSchema.partial().omit({ locationId: true });
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

// ─── Staff ─────────────────────────────────────────────────────

export const employmentTypeSchema = z.enum([
  'EMPLOYEE',
  'CONTRACTOR',
  'BOOTH_RENTER',
  'COMMISSION',
  'OWNER',
]);
export type EmploymentType = z.infer<typeof employmentTypeSchema>;

export const createStaffSchema = z.object({
  userId: uuidSchema.optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  displayName: z.string().max(100).nullable().optional(),
  email: z.string().email(),
  phone: z.string().max(30).nullable().optional(),
  role: staffRoleSchema,
  employmentType: employmentTypeSchema,
  commissionRate: z.number().min(0).max(100).nullable().optional(),
  boothRent: z.number().min(0).nullable().optional(),
  hourlyRate: z.number().min(0).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  photoUrl: z.string().url().nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  startsAt: z.string().datetime({ offset: true }).nullable().optional(),
  locationIds: z.array(uuidSchema).min(1).max(50),
  serviceIds: z.array(uuidSchema).default([]),
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = createStaffSchema
  .partial()
  .omit({ userId: true })
  .extend({
    active: z.boolean().optional(),
  });
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

// ─── Shift + TimeOff ───────────────────────────────────────────

export const createShiftSchema = z
  .object({
    staffId: uuidSchema,
    locationId: uuidSchema,
    startAt: z.string().datetime({ offset: true }),
    endAt: z.string().datetime({ offset: true }),
    isOpen: z.boolean().default(false),
  })
  .refine((v) => new Date(v.endAt) > new Date(v.startAt), {
    message: 'endAt must be after startAt',
    path: ['endAt'],
  });
export type CreateShiftInput = z.infer<typeof createShiftSchema>;

export const createTimeOffSchema = z
  .object({
    staffId: uuidSchema,
    startAt: z.string().datetime({ offset: true }),
    endAt: z.string().datetime({ offset: true }),
    reason: z.string().max(500).optional(),
  })
  .refine((v) => new Date(v.endAt) > new Date(v.startAt), {
    message: 'endAt must be after startAt',
    path: ['endAt'],
  });
export type CreateTimeOffInput = z.infer<typeof createTimeOffSchema>;
