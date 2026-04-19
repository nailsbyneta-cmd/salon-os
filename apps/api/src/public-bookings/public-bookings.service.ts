import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Appointment, Location, PrismaClient, Service } from '@salon-os/db';
import { WITH_TENANT } from '../db/db.module.js';
import { RemindersService } from '../reminders/reminders.service.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

export interface AvailabilitySlot {
  startAt: string; // ISO 8601
  endAt: string;
  staffId: string;
  staffDisplayName: string;
  priceMinor: number;
  currency: string;
}

export interface PublicBookingInput {
  serviceId: string;
  staffId?: string; // optional — "no preference" → any
  locationId: string;
  startAt: string;
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  notes?: string;
  language?: string;
}

const PG_EXCLUSION_VIOLATION = 'P2002';
const PG_RAW_EXCLUSION = '23P01';

function isConflictError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as { code?: string }).code;
  return (
    code === PG_EXCLUSION_VIOLATION ||
    code === PG_RAW_EXCLUSION ||
    err.message.includes('appointment_no_overlap_per_staff') ||
    err.message.includes('exclusion_violation')
  );
}

@Injectable()
export class PublicBookingsService {
  constructor(
    @Inject('PRISMA_PUBLIC') private readonly prismaPublic: PrismaClient,
    @Inject(WITH_TENANT) private readonly withTenant: WithTenantFn,
    private readonly reminders: RemindersService,
  ) {}

  /** Löst den Tenant aus dem URL-Slug auf (BYPASS-RLS via Admin-Connection). */
  private async resolveTenant(slug: string): Promise<{ id: string; timezone: string; currency: string }> {
    const tenant = await this.prismaPublic.tenant.findUnique({
      where: { slug },
      select: { id: true, timezone: true, currency: true, status: true },
    });
    if (!tenant || tenant.status === 'SUSPENDED' || tenant.status === 'CANCELLED') {
      throw new NotFoundException(`Unknown or inactive tenant: ${slug}`);
    }
    return tenant;
  }

  async listLocations(slug: string): Promise<Location[]> {
    const tenant = await this.resolveTenant(slug);
    return this.withTenant(tenant.id, null, null, async (tx) => {
      return tx.location.findMany({
        where: { deletedAt: null, publicProfile: true },
        orderBy: { name: 'asc' },
      });
    });
  }

  async listServices(slug: string): Promise<Service[]> {
    const tenant = await this.resolveTenant(slug);
    return this.withTenant(tenant.id, null, null, async (tx) => {
      return tx.service.findMany({
        where: { deletedAt: null, bookable: true },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      });
    });
  }

  /**
   * Slot-Vorschläge für einen Service an einem Tag + Location.
   * Einfacher Algorithmus (MVP): nimm Öffnungszeiten der Location, teile
   * in Service-Dauer-Intervalle, filtere gegen bestehende Termine.
   * Precision-Scheduling-AI folgt in Phase 3.
   */
  async availability(
    slug: string,
    serviceId: string,
    opts: { date: string; locationId: string },
  ): Promise<AvailabilitySlot[]> {
    const tenant = await this.resolveTenant(slug);
    return this.withTenant(tenant.id, null, null, async (tx) => {
      const service = await tx.service.findFirst({
        where: { id: serviceId, deletedAt: null, bookable: true },
      });
      if (!service) throw new NotFoundException('Service not found');

      const location = await tx.location.findFirst({
        where: { id: opts.locationId, deletedAt: null, publicProfile: true },
      });
      if (!location) throw new NotFoundException('Location not found');

      const eligibleStaff = await tx.staff.findMany({
        where: {
          active: true,
          deletedAt: null,
          services: { some: { serviceId } },
          locationAssignments: { some: { locationId: opts.locationId } },
        },
      });
      if (eligibleStaff.length === 0) return [];

      const dayStart = new Date(`${opts.date}T00:00:00Z`);
      const dayEnd = new Date(`${opts.date}T23:59:59Z`);

      const existing = await tx.appointment.findMany({
        where: {
          staffId: { in: eligibleStaff.map((s) => s.id) },
          startAt: { gte: dayStart, lte: dayEnd },
          status: { notIn: ['CANCELLED', 'NO_SHOW', 'WAITLIST'] },
        },
        select: { staffId: true, startAt: true, endAt: true },
      });

      // Einfache Öffnungszeiten-Heuristik: 09:00–18:00 im locationTz.
      // Phase 2: echte openingHours-JSON aus location.openingHours parsen.
      const duration = service.durationMinutes + service.bufferAfterMin + service.bufferBeforeMin;
      const slots: AvailabilitySlot[] = [];
      const slotMinutes = 30; // Raster
      const openHour = 9;
      const closeHour = 18;

      for (const staff of eligibleStaff) {
        for (let h = openHour; h < closeHour; h++) {
          for (let m = 0; m < 60; m += slotMinutes) {
            const start = new Date(`${opts.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`);
            const end = new Date(start.getTime() + duration * 60_000);
            if (end.getHours() >= closeHour) continue;

            const overlaps = existing.some(
              (a) =>
                a.staffId === staff.id &&
                !(new Date(a.endAt) <= start || new Date(a.startAt) >= end),
            );
            if (overlaps) continue;

            slots.push({
              startAt: start.toISOString(),
              endAt: end.toISOString(),
              staffId: staff.id,
              staffDisplayName: staff.displayName ?? `${staff.firstName} ${staff.lastName}`,
              priceMinor: Math.round(Number(service.basePrice) * 100),
              currency: location.currency,
            });
          }
        }
      }
      return slots.slice(0, 50);
    });
  }

  async createBooking(slug: string, input: PublicBookingInput): Promise<Appointment> {
    const tenant = await this.resolveTenant(slug);
    try {
      const created = await this.withTenant(tenant.id, null, null, async (tx) => {
        const service = await tx.service.findFirst({
          where: { id: input.serviceId, deletedAt: null, bookable: true },
        });
        if (!service) throw new NotFoundException('Service not found');

        let staffId = input.staffId;
        if (!staffId) {
          // "No preference" → pick any staff at this location who offers this service.
          const candidate = await tx.staff.findFirst({
            where: {
              active: true,
              deletedAt: null,
              services: { some: { serviceId: input.serviceId } },
              locationAssignments: { some: { locationId: input.locationId } },
            },
          });
          if (!candidate) throw new NotFoundException('No staff available');
          staffId = candidate.id;
        }

        // Client-Deduplizierung via Email oder Phone — Phase 2 macht
        // libphonenumber-E164-Normalisierung; MVP: exakter Match.
        const existingClient = await tx.client.findFirst({
          where: {
            OR: [
              { email: input.client.email },
              ...(input.client.phone ? [{ phone: input.client.phone }] : []),
            ],
            deletedAt: null,
          },
        });

        const client =
          existingClient ??
          (await tx.client.create({
            data: {
              tenantId: tenant.id,
              firstName: input.client.firstName,
              lastName: input.client.lastName,
              email: input.client.email,
              phone: input.client.phone ?? null,
              language: input.language ?? 'de-CH',
              source: 'public_booking',
            },
          }));

        const startAt = new Date(input.startAt);
        const endAt = new Date(
          startAt.getTime() +
            (service.durationMinutes + service.bufferBeforeMin + service.bufferAfterMin) *
              60_000,
        );

        return tx.appointment.create({
          data: {
            tenantId: tenant.id,
            locationId: input.locationId,
            clientId: client.id,
            staffId,
            status: 'BOOKED',
            startAt,
            endAt,
            bookedVia: 'ONLINE_BRANDED',
            notes: input.notes ?? null,
            language: input.language ?? 'de-CH',
            items: {
              create: [
                {
                  serviceId: service.id,
                  staffId,
                  price: service.basePrice,
                  duration: service.durationMinutes,
                  taxClass: service.taxClass,
                },
              ],
            },
          },
          include: { items: true },
        });
      });

      this.reminders
        .scheduleEmailReminder({
          appointmentId: created.id,
          tenantId: tenant.id,
          startAt: created.startAt,
        })
        .catch(() => {
          /* logged in RemindersService */
        });

      return created;
    } catch (err) {
      if (isConflictError(err)) {
        throw new ConflictException({
          type: 'https://salon-os.com/errors/appointment/conflict',
          title: 'Slot no longer available',
          detail: 'This time slot was just booked by someone else. Please choose another.',
          errors: [{ path: 'startAt', code: 'slot_taken' }],
        });
      }
      throw err;
    }
  }
}
