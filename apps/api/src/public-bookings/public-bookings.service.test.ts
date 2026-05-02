import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PublicBookingsService } from './public-bookings.service.js';

function makePrismaPublic(tenantOverride?: Partial<{ status: string }>) {
  return {
    tenant: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'tenant1',
        slug: 'demo-salon',
        name: 'Demo Salon',
        countryCode: 'CH',
        timezone: 'Europe/Zurich',
        currency: 'CHF',
        status: 'ACTIVE',
        tagline: null,
        description: null,
        logoUrl: null,
        heroImageUrl: null,
        brandColor: null,
        instagramUrl: null,
        facebookUrl: null,
        tiktokUrl: null,
        whatsappE164: null,
        googleBusinessUrl: null,
        ...tenantOverride,
      }),
    },
    tenantAdsIntegration: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
}

function makePrisma() {
  return {
    location: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
    service: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
    staff: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
    appointment: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    client: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
    salonFAQ: { findMany: vi.fn().mockResolvedValue([]) },
    salonReview: { findMany: vi.fn().mockResolvedValue([]) },
    salonGalleryImage: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

function makeWithTenant(prisma: ReturnType<typeof makePrisma>) {
  return vi.fn(
    (
      _tid: string,
      _uid: string | null,
      _role: string | null,
      fn: (tx: unknown) => Promise<unknown>,
    ) => fn(prisma),
  );
}

function makeReminders() {
  return {
    sendConfirmationNow: vi.fn().mockResolvedValue(undefined),
    scheduleEmailReminder: vi.fn().mockResolvedValue(undefined),
    enqueueConfirmationViaOutbox: vi.fn().mockResolvedValue(undefined),
    enqueueReminderViaOutbox: vi.fn().mockResolvedValue(undefined),
    cancelReminder: vi.fn().mockResolvedValue(undefined),
  };
}

const BASE_SERVICE = {
  id: 'svc1',
  durationMinutes: 60,
  bufferBeforeMin: 0,
  bufferAfterMin: 10,
  basePrice: 80,
  taxClass: null,
};

const BASE_LOCATION = {
  id: 'loc1',
  name: 'Hauptsalon',
  city: 'Zürich',
  address1: 'Bahnhofstr. 1',
  address2: null,
  postalCode: '8001',
  countryCode: 'CH',
  phone: null,
  email: null,
  latitude: null,
  longitude: null,
  timezone: 'Europe/Zurich',
  currency: 'CHF',
  openingHours: { mon: { open: '09:00', close: '18:00' } },
  publicProfile: true,
};

const BASE_STAFF = {
  id: 'staff1',
  firstName: 'Neta',
  lastName: 'Muster',
  displayName: 'Neta',
  bio: null,
  photoUrl: null,
  color: '#FF0000',
};

describe('PublicBookingsService', () => {
  let service: PublicBookingsService;
  let prismaPublic: ReturnType<typeof makePrismaPublic>;
  let prisma: ReturnType<typeof makePrisma>;
  let reminders: ReturnType<typeof makeReminders>;

  beforeEach(() => {
    prismaPublic = makePrismaPublic();
    prisma = makePrisma();
    const withTenant = makeWithTenant(prisma);
    reminders = makeReminders();
    service = new PublicBookingsService(
      prismaPublic as never,
      withTenant as never,
      reminders as never,
    );
  });

  // ── resolveTenant (via listServices) ─────────────────────────────────────

  describe('tenant resolution', () => {
    it('throws NotFoundException for unknown slug', async () => {
      prismaPublic.tenant.findUnique.mockResolvedValue(null);
      await expect(service.listServices('unknown')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for SUSPENDED tenant', async () => {
      prismaPublic.tenant.findUnique.mockResolvedValue({
        id: 'tenant1',
        status: 'SUSPENDED',
        timezone: 'UTC',
        currency: 'CHF',
      });
      await expect(service.listServices('demo-salon')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for CANCELLED tenant', async () => {
      prismaPublic.tenant.findUnique.mockResolvedValue({
        id: 'tenant1',
        status: 'CANCELLED',
        timezone: 'UTC',
        currency: 'CHF',
      });
      await expect(service.listServices('demo-salon')).rejects.toThrow(NotFoundException);
    });
  });

  // ── listServices() ────────────────────────────────────────────────────────

  describe('listServices()', () => {
    it('returns only bookable services', async () => {
      prisma.service.findMany.mockResolvedValue([{ ...BASE_SERVICE, bookable: true }]);
      const result = await service.listServices('demo-salon');
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ bookable: true, deletedAt: null }),
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  // ── getPublicProfile() ────────────────────────────────────────────────────

  describe('getPublicProfile()', () => {
    it('returns tenant data with locations, staff, faqs, reviews, gallery', async () => {
      prisma.location.findMany.mockResolvedValue([BASE_LOCATION]);
      prisma.staff.findMany.mockResolvedValue([BASE_STAFF]);
      const result = await service.getPublicProfile('demo-salon');
      expect(result.tenant.slug).toBe('demo-salon');
      expect(result.locations).toHaveLength(1);
      expect(result.staff).toHaveLength(1);
    });

    it('converts Decimal latitude/longitude to Number', async () => {
      prisma.location.findMany.mockResolvedValue([
        { ...BASE_LOCATION, latitude: '47.3769', longitude: '8.5417' },
      ]);
      const result = await service.getPublicProfile('demo-salon');
      expect(typeof result.locations[0]!.latitude).toBe('number');
      expect(result.locations[0]!.latitude).toBeCloseTo(47.3769);
    });

    it('keeps null latitude/longitude as null', async () => {
      prisma.location.findMany.mockResolvedValue([BASE_LOCATION]);
      const result = await service.getPublicProfile('demo-salon');
      expect(result.locations[0]!.latitude).toBeNull();
    });
  });

  // ── availability() ────────────────────────────────────────────────────────

  describe('availability()', () => {
    it('returns empty array when no eligible staff', async () => {
      prisma.service.findFirst.mockResolvedValue(BASE_SERVICE);
      prisma.location.findFirst.mockResolvedValue(BASE_LOCATION);
      prisma.staff.findMany.mockResolvedValue([]);
      const result = await service.availability('demo-salon', 'svc1', {
        date: '2025-06-02',
        locationId: 'loc1',
      });
      expect(result).toEqual([]);
    });

    it('throws NotFoundException when service not found', async () => {
      prisma.service.findFirst.mockResolvedValue(null);
      await expect(
        service.availability('demo-salon', 'svc1', { date: '2025-06-02', locationId: 'loc1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when location not found', async () => {
      prisma.service.findFirst.mockResolvedValue(BASE_SERVICE);
      prisma.location.findFirst.mockResolvedValue(null);
      await expect(
        service.availability('demo-salon', 'svc1', { date: '2025-06-02', locationId: 'loc1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns empty array when day is closed (no openingHours entry)', async () => {
      prisma.service.findFirst.mockResolvedValue(BASE_SERVICE);
      // Sunday (2025-06-01 = Sunday), openingHours has no 'sun' key → closed
      prisma.location.findFirst.mockResolvedValue({
        ...BASE_LOCATION,
        openingHours: { mon: { open: '09:00', close: '18:00' } },
      });
      prisma.staff.findMany.mockResolvedValue([BASE_STAFF]);
      const result = await service.availability('demo-salon', 'svc1', {
        date: '2025-06-01',
        locationId: 'loc1',
      });
      expect(result).toEqual([]);
    });

    it('generates slots for an open day without conflicts', async () => {
      prisma.service.findFirst.mockResolvedValue({
        ...BASE_SERVICE,
        durationMinutes: 60,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      });
      // Monday 2025-06-02, open 09:00–11:00 → fits exactly 2 slots (09:00 + 09:30 start if duration=60? no: 09:00 and... 09:00+60=10:00 <= 11:00 close → slot at 09:00, then 09:30+60=10:30 <= 11:00 → slot at 09:30, then 10:00+60=11:00 <= 11:00 → slot at 10:00)
      prisma.location.findFirst.mockResolvedValue({
        ...BASE_LOCATION,
        openingHours: { mon: { open: '09:00', close: '11:00' } },
      });
      prisma.staff.findMany.mockResolvedValue([BASE_STAFF]);
      prisma.appointment.findMany.mockResolvedValue([]);
      const result = await service.availability('demo-salon', 'svc1', {
        date: '2025-06-02',
        locationId: 'loc1',
      });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({ staffId: 'staff1', currency: 'CHF' });
    });

    it('excludes slots that overlap existing appointments', async () => {
      prisma.service.findFirst.mockResolvedValue({
        ...BASE_SERVICE,
        durationMinutes: 60,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      });
      prisma.location.findFirst.mockResolvedValue({
        ...BASE_LOCATION,
        openingHours: { mon: { open: '09:00', close: '11:00' } },
      });
      prisma.staff.findMany.mockResolvedValue([BASE_STAFF]);
      // Block all of 09:00–11:00 for staff1
      prisma.appointment.findMany.mockResolvedValue([
        {
          staffId: 'staff1',
          startAt: new Date('2025-06-02T07:00:00Z'),
          endAt: new Date('2025-06-02T11:00:00Z'),
        },
      ]);
      const result = await service.availability('demo-salon', 'svc1', {
        date: '2025-06-02',
        locationId: 'loc1',
      });
      expect(result).toEqual([]);
    });

    it('caps result at 50 slots', async () => {
      prisma.service.findFirst.mockResolvedValue({
        ...BASE_SERVICE,
        durationMinutes: 1,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      });
      prisma.location.findFirst.mockResolvedValue({
        ...BASE_LOCATION,
        openingHours: { mon: { open: '00:00', close: '23:59' } },
      });
      prisma.staff.findMany.mockResolvedValue([BASE_STAFF]);
      prisma.appointment.findMany.mockResolvedValue([]);
      const result = await service.availability('demo-salon', 'svc1', {
        date: '2025-06-02',
        locationId: 'loc1',
      });
      expect(result.length).toBeLessThanOrEqual(50);
    });
  });

  // ── createBooking() ───────────────────────────────────────────────────────

  describe('createBooking()', () => {
    const BASE_INPUT = {
      serviceId: 'svc1',
      locationId: 'loc1',
      startAt: '2025-06-02T09:00:00Z',
      client: { firstName: 'Anna', lastName: 'Muster', email: 'anna@test.ch' },
    };

    beforeEach(() => {
      prisma.service.findFirst.mockResolvedValue(BASE_SERVICE);
      prisma.staff.findFirst.mockResolvedValue(BASE_STAFF);
      prisma.client.create.mockResolvedValue({ id: 'client1', ...BASE_INPUT.client });
      prisma.appointment.create.mockResolvedValue({
        id: 'appt1',
        startAt: new Date(BASE_INPUT.startAt),
        items: [],
      });
    });

    it('throws NotFoundException when service not bookable', async () => {
      prisma.service.findFirst.mockResolvedValue(null);
      await expect(service.createBooking('demo-salon', BASE_INPUT)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when no staff available (no preference)', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);
      await expect(service.createBooking('demo-salon', BASE_INPUT)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('reuses existing client when email matches', async () => {
      const existing = { id: 'existing1', email: 'anna@test.ch' };
      prisma.client.findFirst.mockResolvedValue(existing);
      await service.createBooking('demo-salon', BASE_INPUT);
      expect(prisma.client.create).not.toHaveBeenCalled();
    });

    it('creates new client when no match found', async () => {
      prisma.client.findFirst.mockResolvedValue(null);
      await service.createBooking('demo-salon', BASE_INPUT);
      expect(prisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'anna@test.ch', source: 'public_booking' }),
        }),
      );
    });

    it('uses provided staffId instead of auto-selection', async () => {
      prisma.client.findFirst.mockResolvedValue(null);
      await service.createBooking('demo-salon', { ...BASE_INPUT, staffId: 'staff2' });
      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ staffId: 'staff2' }) }),
      );
    });

    it('sets bookedVia to ONLINE_BRANDED', async () => {
      prisma.client.findFirst.mockResolvedValue(null);
      await service.createBooking('demo-salon', BASE_INPUT);
      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ bookedVia: 'ONLINE_BRANDED' }) }),
      );
    });

    it('wraps slot conflict error in ConflictException', async () => {
      const err = Object.assign(new Error('exclusion_violation'), { code: '23P01' });
      prisma.appointment.create.mockRejectedValue(err);
      prisma.client.findFirst.mockResolvedValue(null);
      await expect(service.createBooking('demo-salon', BASE_INPUT)).rejects.toThrow(
        ConflictException,
      );
    });

    it('sends confirmation reminder after successful booking', async () => {
      prisma.client.findFirst.mockResolvedValue(null);
      await service.createBooking('demo-salon', BASE_INPUT);
      // fire-and-forget: wait a tick
      await new Promise((r) => setTimeout(r, 10));
      expect(reminders.enqueueConfirmationViaOutbox).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ appointmentId: 'appt1', tenantId: 'tenant1' }),
      );
    });

    it('defaults language to de-CH when not provided', async () => {
      prisma.client.findFirst.mockResolvedValue(null);
      await service.createBooking('demo-salon', BASE_INPUT);
      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ language: 'de-CH' }) }),
      );
    });
  });
});
