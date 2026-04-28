import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Appointment, Location, PrismaClient, Service } from '@salon-os/db';
import { normalizePhone } from '@salon-os/utils';
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
  /** Wizard-Variant-Auswahl. Backend resolves Labels und schreibt sie auf
   *  appointmentItem.optionLabels (für Calendar + Email + Receipt). */
  optionIds?: string[];
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
  private async resolveTenant(
    slug: string,
  ): Promise<{ id: string; timezone: string; currency: string }> {
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
   * "Nächster freier Termin"-Suche. Geht ab `fromDate` bis zu `maxDays` Tage
   * vorwärts und gibt den ersten verfügbaren Slot zurück. Audit Pass-13
   * Top-3 Customer-UX: "Wenn alle heutigen Slots belegt sind, ein 'Nächster
   * freier Termin →'-Button würde den Flow für Rückkehrerinnen beschleunigen."
   */
  async findNextSlot(
    slug: string,
    serviceId: string,
    locationId: string,
    fromDateIso: string,
    durationOverrideMin?: number,
    maxDays = 14,
  ): Promise<AvailabilitySlot | null> {
    const start = new Date(`${fromDateIso}T00:00:00Z`);
    for (let i = 0; i < maxDays; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const dateIso = d.toISOString().slice(0, 10);
      const slots = await this.availability(slug, serviceId, {
        date: dateIso,
        locationId,
        durationOverrideMin,
      });
      if (slots.length > 0) {
        return slots[0]!;
      }
    }
    return null;
  }

  /**
   * Public-Endpoint für ICS-Download nach erfolgreicher Buchung.
   * /success-Page lädt diesen → Apple/Google Calendar Add-Dialog.
   * Auth: nur appointmentId reicht (UUIDs sind nicht enumerable, plus
   * läuft normalerweise direkt nach dem Booking-Submit).
   */
  async getAppointmentIcs(slug: string, appointmentId: string): Promise<string | null> {
    const tenant = await this.resolveTenant(slug);
    return this.withTenant(tenant.id, null, null, async (tx) => {
      const appt = await tx.appointment.findFirst({
        where: { id: appointmentId, tenantId: tenant.id },
        include: {
          location: { select: { name: true } },
          staff: { select: { firstName: true } },
          items: { include: { service: { select: { name: true } } } },
        },
      });
      if (!appt) return null;
      const tenantRow = await tx.tenant.findUnique({
        where: { id: tenant.id },
        select: { name: true },
      });
      const summary = `${tenantRow?.name ?? 'Salon'} — ${appt.items.map((i) => i.service.name).join(' + ')}`;
      const description = `Termin bei ${appt.staff.firstName}\n${appt.location.name}`;
      const { generateIcs } = await import('../outbox/ics.js');
      return generateIcs({
        uid: appt.id,
        summary,
        description,
        location: appt.location.name,
        startUtc: appt.startAt,
        endUtc: appt.endAt,
        organizerName: tenantRow?.name ?? 'Salon',
      });
    });
  }

  /**
   * Public-Endpoint für Mitarbeiter-Picker im Booking-Flow.
   * Liefert NUR Staff die diesen Service an dieser Location anbieten —
   * Phorest-Pattern "Wer betreut Dich?" zwischen Service-Auswahl und Slot-Picker.
   */
  async listEligibleStaff(
    slug: string,
    serviceId: string,
    locationId: string,
  ): Promise<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      displayName: string | null;
      bio: string | null;
      photoUrl: string | null;
      color: string | null;
    }>
  > {
    const tenant = await this.resolveTenant(slug);
    return this.withTenant(tenant.id, null, null, async (tx) => {
      return tx.staff.findMany({
        where: {
          active: true,
          deletedAt: null,
          services: { some: { serviceId } },
          locationAssignments: { some: { locationId } },
        },
        orderBy: { firstName: 'asc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          bio: true,
          photoUrl: true,
          color: true,
        },
      });
    });
  }

  /**
   * Public-Kategorien für die Booking-Page-Folder-Gruppierung. Ohne diese
   * fielen alle Folder auf "Services" zurück (Audit-Befund).
   */
  async listServiceCategories(
    slug: string,
  ): Promise<Array<{ id: string; name: string; order: number }>> {
    const tenant = await this.resolveTenant(slug);
    return this.withTenant(tenant.id, null, null, async (tx) => {
      const cats = await tx.serviceCategory.findMany({
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, order: true },
      });
      return cats;
    });
  }

  /**
   * Service-Detail für Online-Booking: liefert Service + Varianten + Add-Ons
   * + Bundle-Cross-Sell eingebettet. Ein Fetch, Wizard kann direkt
   * rendern.
   */
  async getServiceDetail(
    slug: string,
    serviceId: string,
  ): Promise<{
    service: Service;
    optionGroups: Array<{
      id: string;
      name: string;
      required: boolean;
      multi: boolean;
      sortOrder: number;
      options: Array<{
        id: string;
        label: string;
        priceDelta: unknown;
        durationDeltaMin: number;
        processingDeltaMin: number;
        isDefault: boolean;
        sortOrder: number;
      }>;
    }>;
    addOns: Array<{
      id: string;
      name: string;
      priceDelta: unknown;
      durationDeltaMin: number;
      sortOrder: number;
    }>;
    bundles: Array<{
      id: string;
      label: string;
      discountAmount: unknown;
      discountPct: unknown;
      bundledService: { id: string; name: string; basePrice: unknown; durationMinutes: number };
    }>;
  }> {
    const tenant = await this.resolveTenant(slug);
    return this.withTenant(tenant.id, null, null, async (tx) => {
      const service = await tx.service.findFirst({
        where: { id: serviceId, deletedAt: null, bookable: true },
      });
      if (!service) throw new NotFoundException(`Service ${serviceId} not found`);

      const [optionGroups, addOns, bundles] = await Promise.all([
        tx.serviceOptionGroup.findMany({
          where: { serviceId },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: { options: { orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] } },
        }),
        tx.serviceAddOn.findMany({
          where: { serviceId },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
        tx.serviceBundle.findMany({
          where: { primaryServiceId: serviceId, active: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            bundledService: {
              select: { id: true, name: true, basePrice: true, durationMinutes: true },
            },
          },
        }),
      ]);

      return { service, optionGroups, addOns, bundles };
    });
  }

  /**
   * Öffentliches Profil: Tenant-Meta + aktive Standorte mit
   * Öffnungszeiten/Adresse + buchbare Staff mit Name/Bio/Foto.
   * Alle Infos, die eine Salon-Homepage braucht — ohne Umsatz,
   * Anstellungsart oder interne Kommentare.
   */
  async getPublicProfile(slug: string): Promise<{
    tenant: {
      slug: string;
      name: string;
      countryCode: string;
      timezone: string;
      currency: string;
      tagline: string | null;
      description: string | null;
      logoUrl: string | null;
      heroImageUrl: string | null;
      brandColor: string | null;
      instagramUrl: string | null;
      facebookUrl: string | null;
      tiktokUrl: string | null;
      whatsappE164: string | null;
      googleBusinessUrl: string | null;
    };
    locations: Array<{
      id: string;
      name: string;
      city: string | null;
      address1: string | null;
      address2: string | null;
      postalCode: string | null;
      countryCode: string;
      phone: string | null;
      email: string | null;
      latitude: number | null;
      longitude: number | null;
      openingHours: unknown;
    }>;
    staff: Array<{
      id: string;
      firstName: string;
      lastName: string;
      displayName: string | null;
      bio: string | null;
      photoUrl: string | null;
      color: string | null;
    }>;
    faqs: Array<{ id: string; question: string; answer: string }>;
    reviews: Array<{
      id: string;
      authorName: string;
      rating: number;
      text: string;
      sourceUrl: string | null;
      featured: boolean;
      createdAt: Date;
    }>;
    gallery: Array<{ id: string; imageUrl: string; caption: string | null }>;
  }> {
    const tenantFull = await this.prismaPublic.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        countryCode: true,
        timezone: true,
        currency: true,
        status: true,
        tagline: true,
        description: true,
        logoUrl: true,
        heroImageUrl: true,
        brandColor: true,
        instagramUrl: true,
        facebookUrl: true,
        tiktokUrl: true,
        whatsappE164: true,
        googleBusinessUrl: true,
      },
    });
    if (!tenantFull || tenantFull.status === 'SUSPENDED' || tenantFull.status === 'CANCELLED') {
      throw new NotFoundException(`Unknown or inactive tenant: ${slug}`);
    }
    return this.withTenant(tenantFull.id, null, null, async (tx) => {
      const [locations, staff, faqs, reviews, gallery] = await Promise.all([
        tx.location.findMany({
          where: { deletedAt: null, publicProfile: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            city: true,
            address1: true,
            address2: true,
            postalCode: true,
            countryCode: true,
            phone: true,
            email: true,
            latitude: true,
            longitude: true,
            openingHours: true,
          },
        }),
        tx.staff.findMany({
          where: { deletedAt: null, active: true },
          orderBy: { firstName: 'asc' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            bio: true,
            photoUrl: true,
            color: true,
          },
        }),
        tx.salonFAQ.findMany({
          where: { active: true },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          select: { id: true, question: true, answer: true },
        }),
        tx.salonReview.findMany({
          orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
          take: 12,
          select: {
            id: true,
            authorName: true,
            rating: true,
            text: true,
            sourceUrl: true,
            featured: true,
            createdAt: true,
          },
        }),
        tx.salonGalleryImage.findMany({
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          take: 24,
          select: { id: true, imageUrl: true, caption: true },
        }),
      ]);
      return {
        tenant: {
          slug: tenantFull.slug,
          name: tenantFull.name,
          countryCode: tenantFull.countryCode,
          timezone: tenantFull.timezone,
          currency: tenantFull.currency,
          tagline: tenantFull.tagline,
          description: tenantFull.description,
          logoUrl: tenantFull.logoUrl,
          heroImageUrl: tenantFull.heroImageUrl,
          brandColor: tenantFull.brandColor,
          instagramUrl: tenantFull.instagramUrl,
          facebookUrl: tenantFull.facebookUrl,
          tiktokUrl: tenantFull.tiktokUrl,
          whatsappE164: tenantFull.whatsappE164,
          googleBusinessUrl: tenantFull.googleBusinessUrl,
        },
        locations: locations.map((l) => ({
          ...l,
          latitude: l.latitude ? Number(l.latitude) : null,
          longitude: l.longitude ? Number(l.longitude) : null,
        })),
        staff,
        faqs,
        reviews,
        gallery,
      };
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
    opts: { date: string; locationId: string; durationOverrideMin?: number },
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

      // Wizard kann effektive Dauer (inkl. Varianten + Add-Ons + Bundle) übergeben
      const activeMin = opts.durationOverrideMin ?? service.durationMinutes;
      const duration = activeMin + service.bufferAfterMin + service.bufferBeforeMin;
      // Slot-Granularität = Service-Dauer (min 15). NICHT auf 15-Min-Grid
      // runden — sonst sieht ein 39-Min-Service Slots im 45-Min-Abstand und
      // verliert mögliche Buchungen (Audit-Befund Pass 7).
      const slotMinutes = Math.max(15, duration);

      // Echte Öffnungszeiten aus location.openingHours nutzen.
      // Format: { mon: [{open:"09:00",close:"19:00"}], ... }
      // Fallback: 09:00–18:00 wenn Tag leer/fehlt.
      const intervals = resolveOpeningIntervals(location.openingHours, opts.date);
      if (intervals.length === 0) return [];

      const slots: AvailabilitySlot[] = [];
      for (const staff of eligibleStaff) {
        for (const iv of intervals) {
          for (let t = iv.startMin; t + duration <= iv.endMin; t += slotMinutes) {
            const start = localTimeToUtc(opts.date, t, location.timezone);
            const end = new Date(start.getTime() + duration * 60_000);
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
      slots.sort((a, b) => a.startAt.localeCompare(b.startAt));
      return slots.slice(0, 50);
    });
  }

  /**
   * Multi-Service-Schedule: nimmt mehrere Services + Datum, findet
   * verkettete Slots (auch cross-staff). Algorithmus:
   *  1. Pro Service: alle einzeln-verfügbaren (staff,start,end)-Tripel
   *  2. Cartesian Product mit Ordering-Constraint:
   *     services[i].end <= services[i+1].start (max 30 min Gap erlaubt)
   *  3. Score: minimale Total-Dauer + Gap-Penalty + Same-Staff-Bonus
   *  4. Top 10 zurückliefern
   *
   * Nicht "perfect scheduler" — heuristisch, aber liefert reale
   * Cross-Staff-Optionen die Mitbewerber (Phorest/Fresha) nicht haben.
   */
  async multiSlots(
    slug: string,
    items: Array<{ serviceId: string; durationMinutes?: number }>,
    opts: { date: string; locationId: string },
  ): Promise<{
    options: Array<{
      score: number;
      gapMinutes: number;
      sameStaff: boolean;
      stops: AvailabilitySlot[];
    }>;
  }> {
    const MAX_GAP_MIN = 30;
    const MAX_OPTIONS = 10;
    const MAX_PER_SERVICE = 30;

    if (items.length === 0) return { options: [] };
    if (items.length > 5) {
      throw new BadRequestException('Max 5 Services pro Multi-Booking');
    }

    // 1) Verfügbare Slots pro Service einzeln laden
    const perService = await Promise.all(
      items.map((i) =>
        this.availability(slug, i.serviceId, {
          date: opts.date,
          locationId: opts.locationId,
          durationOverrideMin: i.durationMinutes,
        }),
      ),
    );

    // Wenn ein Service nichts hat → keine valid combination
    if (perService.some((s) => s.length === 0)) return { options: [] };

    // 2) Iterative DFS — sequentielle Ketten bauen
    const trim = perService.map((slots) => slots.slice(0, MAX_PER_SERVICE));
    const results: Array<{
      score: number;
      gapMinutes: number;
      sameStaff: boolean;
      stops: AvailabilitySlot[];
    }> = [];

    const visit = (idx: number, chain: AvailabilitySlot[]): void => {
      if (results.length >= MAX_OPTIONS * 4) return; // Cap inner exploration
      if (idx === trim.length) {
        const totalGap = chain.slice(1).reduce((sum, slot, i) => {
          const prevEnd = new Date(chain[i]!.endAt).getTime();
          const thisStart = new Date(slot.startAt).getTime();
          return sum + Math.max(0, (thisStart - prevEnd) / 60_000);
        }, 0);
        const sameStaff = chain.every((s) => s.staffId === chain[0]!.staffId);
        // Niedriger Score = besser. Total-Dauer + Gap-Penalty + Cross-Staff-Cost
        const totalMin =
          (new Date(chain[chain.length - 1]!.endAt).getTime() -
            new Date(chain[0]!.startAt).getTime()) /
          60_000;
        const score = totalMin + totalGap * 1.5 + (sameStaff ? 0 : 5);
        // CRITICAL: chain wird beim Backtracking mutiert (push/pop). Ohne Copy
        // teilen alle Results die SELBE Array-Referenz und werden auf [] geleert
        // wenn DFS terminiert — Bug der seit Wochen Multi-Service-Slots auf 0
        // gehalten hat.
        results.push({ score, gapMinutes: totalGap, sameStaff, stops: [...chain] });
        return;
      }
      const candidates = trim[idx]!;
      const lastEnd = chain.length > 0 ? new Date(chain[chain.length - 1]!.endAt).getTime() : 0;
      for (const cand of candidates) {
        const candStart = new Date(cand.startAt).getTime();
        if (chain.length > 0) {
          const gap = (candStart - lastEnd) / 60_000;
          if (gap < 0 || gap > MAX_GAP_MIN) continue;
        }
        chain.push(cand);
        visit(idx + 1, chain);
        chain.pop();
      }
    };
    visit(0, []);

    // Dedupe identische Ketten (gleiche Staff+Times) und Top-N nach Score
    const seen = new Set<string>();
    const deduped = results.filter((r) => {
      const key = r.stops.map((s) => `${s.staffId}@${s.startAt}`).join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Defensive: nie Options mit leerer Slot-Kette zurückgeben — Frontend
    // erwartet stops[0] zu existieren und crasht sonst beim Rendering.
    const valid = deduped.filter((r) => r.stops.length > 0);
    valid.sort((a, b) => a.score - b.score);
    return { options: valid.slice(0, MAX_OPTIONS) };
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
              phoneE164: input.client.phone ? normalizePhone(input.client.phone) : null,
              language: input.language ?? 'de-CH',
              source: 'public_booking',
            },
          }));

        const startAt = new Date(input.startAt);
        const endAt = new Date(
          startAt.getTime() +
            (service.durationMinutes + service.bufferBeforeMin + service.bufferAfterMin) * 60_000,
        );

        // Wizard-Optionen → Labels + Preis-/Dauer-Deltas auf dem Item.
        // Item.price und Item.duration MÜSSEN die Varianten-Werte sein
        // (nicht service.basePrice), sonst zeigen Termin-Detail + Kasse
        // den Basispreis statt der echt bezahlten Summe (Audit Pass 10).
        let optionLabels: string[] = [];
        let priceDelta = 0;
        let durationDelta = 0;
        if (input.optionIds && input.optionIds.length > 0) {
          const opts = await tx.serviceOption.findMany({
            where: { id: { in: input.optionIds }, group: { serviceId: service.id } },
            select: {
              label: true,
              priceDelta: true,
              durationDeltaMin: true,
              group: { select: { sortOrder: true } },
            },
            orderBy: [{ group: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
          });
          optionLabels = opts.map((o) => o.label);
          priceDelta = opts.reduce((sum, o) => sum + Number(o.priceDelta), 0);
          durationDelta = opts.reduce((sum, o) => sum + o.durationDeltaMin, 0);
        }
        const itemPrice = Number(service.basePrice) + priceDelta;
        const itemDuration = service.durationMinutes + durationDelta;

        // endAt korrigieren — die initial berechnete endAt nutzt die Basis-
        // Duration. Bei Variant-Aufschlag muss endAt entsprechend verschoben.
        const adjustedEndAt = new Date(
          startAt.getTime() +
            (itemDuration + service.bufferBeforeMin + service.bufferAfterMin) * 60_000,
        );

        const appt = await tx.appointment.create({
          data: {
            tenantId: tenant.id,
            locationId: input.locationId,
            clientId: client.id,
            staffId,
            status: 'BOOKED',
            startAt,
            endAt: adjustedEndAt,
            bookedVia: 'ONLINE_BRANDED',
            notes: input.notes ?? null,
            language: input.language ?? 'de-CH',
            items: {
              create: [
                {
                  serviceId: service.id,
                  staffId,
                  price: itemPrice,
                  duration: itemDuration,
                  taxClass: service.taxClass,
                  optionLabels,
                },
              ],
            },
          },
          include: { items: true },
        });

        // Atomic Outbox-Enqueue: Bestätigung sofort + 24h-Erinnerung
        // werden im selben TX geschrieben. Tx-Rollback würde sie auch
        // killen — kein Drift zwischen Buchung und Email.
        await this.reminders.enqueueConfirmationViaOutbox(tx, {
          appointmentId: appt.id,
          tenantId: tenant.id,
        });
        await this.reminders.enqueueReminderViaOutbox(tx, {
          appointmentId: appt.id,
          tenantId: tenant.id,
          startAt: appt.startAt,
        });

        return appt;
      });

      return created;
    } catch (err) {
      if (isConflictError(err)) {
        throw new ConflictException({
          type: 'https://salon-os.com/errors/appointment/conflict',
          title: 'Termin gerade vergeben',
          detail:
            'Dieser Termin wurde gerade von jemand anderem gebucht. Bitte wähle einen anderen Slot.',
          errors: [{ path: 'startAt', code: 'slot_taken' }],
        });
      }
      throw err;
    }
  }

  /**
   * Bulk-Booking: erstellt mehrere Termine in einer Transaction für eine
   * Kundin. Wenn ein Stop konfliktet, wird die ganze Buchung zurückgerollt
   * → "alles oder nichts" Garantie für Multi-Service-Cart.
   */
  async createBookingBulk(
    slug: string,
    input: {
      locationId: string;
      stops: Array<{ serviceId: string; staffId: string; startAt: string }>;
      client: { firstName: string; lastName: string; email: string; phone?: string };
      notes?: string;
    },
  ): Promise<Appointment[]> {
    const tenant = await this.resolveTenant(slug);
    try {
      const created = await this.withTenant(tenant.id, null, null, async (tx) => {
        // Services für alle Stops batch-laden
        const serviceIds = [...new Set(input.stops.map((s) => s.serviceId))];
        const services = await tx.service.findMany({
          where: { id: { in: serviceIds }, deletedAt: null, bookable: true },
        });
        if (services.length !== serviceIds.length) {
          throw new NotFoundException('One or more services not found');
        }
        const svcById = new Map(services.map((s) => [s.id, s]));

        // Client dedupe wie bei single createBooking
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
              phoneE164: input.client.phone ? normalizePhone(input.client.phone) : null,
              language: 'de-CH',
              source: 'public_booking',
            },
          }));

        const appointments: Appointment[] = [];
        for (const stop of input.stops) {
          const svc = svcById.get(stop.serviceId)!;
          const startAt = new Date(stop.startAt);
          const endAt = new Date(
            startAt.getTime() +
              (svc.durationMinutes + svc.bufferBeforeMin + svc.bufferAfterMin) * 60_000,
          );
          const appt = await tx.appointment.create({
            data: {
              tenantId: tenant.id,
              locationId: input.locationId,
              clientId: client.id,
              staffId: stop.staffId,
              status: 'BOOKED',
              startAt,
              endAt,
              bookedVia: 'ONLINE_BRANDED',
              notes: input.notes ?? null,
              language: 'de-CH',
              items: {
                create: [
                  {
                    serviceId: svc.id,
                    staffId: stop.staffId,
                    price: svc.basePrice,
                    duration: svc.durationMinutes,
                    taxClass: svc.taxClass,
                  },
                ],
              },
            },
            include: { items: true },
          });
          appointments.push(appt);
        }

        // Atomic Outbox: Bestätigung + 24h-Reminder pro Termin innerhalb TX.
        for (const a of appointments) {
          await this.reminders.enqueueConfirmationViaOutbox(tx, {
            appointmentId: a.id,
            tenantId: tenant.id,
          });
          await this.reminders.enqueueReminderViaOutbox(tx, {
            appointmentId: a.id,
            tenantId: tenant.id,
            startAt: a.startAt,
          });
        }

        return appointments;
      });

      return created;
    } catch (err) {
      if (isConflictError(err)) {
        throw new ConflictException({
          type: 'https://salon-os.com/errors/appointment/conflict',
          title: 'Einer der Slots ist nicht mehr verfügbar',
          detail: 'Bitte such dir eine andere Kombi — die ganze Buchung wurde zurückgerollt.',
        });
      }
      throw err;
    }
  }
}

// ─── Helpers für Öffnungszeiten + Timezone ────────────────────

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

type OpeningDay =
  | { open?: string; close?: string; closed?: boolean }
  | Array<{ open: string; close: string }>
  | undefined;

function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Liest openingHours-JSON für den Wochentag des gegebenen Datums. */
function resolveOpeningIntervals(
  openingHoursRaw: unknown,
  dateIso: string,
): Array<{ startMin: number; endMin: number }> {
  const d = new Date(`${dateIso}T12:00:00Z`);
  const weekday = WEEKDAY_KEYS[d.getUTCDay() % 7]!;
  const map = (openingHoursRaw ?? {}) as Record<string, OpeningDay>;
  const entry = map[weekday];
  if (!entry) return []; // kein Key = zu. Fallback nur wenn kompletter Map leer.
  if (Array.isArray(entry)) {
    const out: Array<{ startMin: number; endMin: number }> = [];
    for (const iv of entry) {
      if (!iv.open || !iv.close) continue;
      const s = hhmmToMinutes(iv.open);
      const e = hhmmToMinutes(iv.close);
      if (e > s) out.push({ startMin: s, endMin: e });
    }
    return out;
  }
  if (entry.closed || !entry.open || !entry.close) return [];
  return [
    {
      startMin: hhmmToMinutes(entry.open),
      endMin: hhmmToMinutes(entry.close),
    },
  ];
}

/**
 * Rechnet lokale Zeit (Datum + Minuten-ab-Mitternacht) im Tenant-TZ
 * in UTC-Date um. Nutzt Intl.DateTimeFormat um den TZ-Offset für den
 * konkreten Tag zu bestimmen (DST-sicher).
 */
function localTimeToUtc(dateIso: string, minutesFromMidnight: number, timezone: string): Date {
  const hh = Math.floor(minutesFromMidnight / 60);
  const mm = minutesFromMidnight % 60;
  // Start: naive UTC
  const naive = new Date(
    `${dateIso}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00Z`,
  );
  // Wie spät wäre es in `timezone`, wenn die UTC-Zeit genau `naive` wäre?
  // Differenz zwischen diesem Zeigestand und `naive` = Offset.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(naive);
  const pick = (t: string): number => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const asUtcFromZoned = Date.UTC(
    pick('year'),
    pick('month') - 1,
    pick('day'),
    pick('hour') === 24 ? 0 : pick('hour'),
    pick('minute'),
    pick('second'),
  );
  const offsetMs = asUtcFromZoned - naive.getTime();
  return new Date(naive.getTime() - offsetMs);
}
