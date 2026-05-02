import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { PrismaClient, SalonReview } from '@salon-os/db';
import { signSelfServiceToken, verifySelfServiceToken } from '@salon-os/utils';
import { PRISMA } from '../db/db.module.js';
import { OutboxService } from '../common/outbox.service.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

const REVIEW_REQUEST_LEAD_HOURS = 24;
const REVIEW_TOKEN_TTL_DAYS = 30;

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Cron-Trigger: findet COMPLETED Termine ohne Review + 24h alt + Email-OptIn,
   * enqueued review.request Outbox-Events. Idempotent — Outbox-Worker prüft
   * nochmal beim Versand ob Review schon existiert.
   */
  async enqueueDueReviewRequests(): Promise<{ enqueued: number; tenants: number }> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - REVIEW_REQUEST_LEAD_HOURS * 60 * 60 * 1000);

    // Selektiere completed Termine ≥24h alt, max 7 Tage zurück (kein Spam
    // bei Backlog-Reset). Client hat email + emailOptIn. Kein bestehender
    // SalonReview für diese appointmentId. Keine bereits enqueued review.request.
    const oldestAllowed = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const candidates = await this.prisma.appointment.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { lte: cutoff, gte: oldestAllowed },
        client: {
          email: { not: null },
          emailOptIn: true,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        tenantId: true,
        clientId: true,
      },
      take: 200,
    });

    if (candidates.length === 0) return { enqueued: 0, tenants: 0 };

    // Schon erledigt? Filtere alle die schon ein Review oder ein
    // pending review.request haben.
    const ids = candidates.map((a) => a.id);
    const existingReviews = await this.prisma.salonReview.findMany({
      where: { appointmentId: { in: ids } },
      select: { appointmentId: true },
    });
    const reviewedIds = new Set(existingReviews.map((r) => r.appointmentId));

    const existingEvents = await this.prisma.outboxEvent.findMany({
      where: {
        type: 'review.request',
        status: { in: ['PENDING', 'PROCESSING', 'DONE'] },
        // payload->>'appointmentId' filter geht in Postgres direkt
      },
      select: { payload: true },
      take: 1000,
    });
    const enqueuedIds = new Set<string>();
    for (const ev of existingEvents) {
      const p = ev.payload as { appointmentId?: string };
      if (p?.appointmentId) enqueuedIds.add(p.appointmentId);
    }

    const toEnqueue = candidates.filter((a) => !reviewedIds.has(a.id) && !enqueuedIds.has(a.id));

    let enqueued = 0;
    const tenants = new Set<string>();
    for (const a of toEnqueue) {
      await this.outbox.writeForTenant(a.tenantId, 'review.request', {
        appointmentId: a.id,
        tenantId: a.tenantId,
        clientId: a.clientId ?? undefined,
      });
      enqueued += 1;
      tenants.add(a.tenantId);
    }
    this.logger.log(`enqueued ${enqueued} review.requests across ${tenants.size} tenants`);
    return { enqueued, tenants: tenants.size };
  }

  /** Sign HMAC-Token für 1-Click-Review-Submit. 30 Tage gültig. */
  buildReviewToken(args: { appointmentId: string; tenantId: string }): string {
    const expiresAt = new Date(Date.now() + REVIEW_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    return signSelfServiceToken({
      action: 'review',
      appointmentId: args.appointmentId,
      tenantId: args.tenantId,
      expiresAt,
    });
  }

  /**
   * Liest den Token, prüft Validity, lädt Termin + Kundin + Tenant für die
   * Review-Submit-Page (zeigt Salon-Name + Stylistin + bewertbarer Service).
   * Wirft 404 wenn Token ungültig/expired.
   */
  async resolveReviewContext(token: string): Promise<{
    appointmentId: string;
    tenantId: string;
    salonName: string;
    salonSlug: string;
    staffFirstName: string;
    serviceName: string;
    appointmentDate: Date;
    alreadySubmitted: boolean;
    clientFirstName: string;
  }> {
    const decoded = verifySelfServiceToken(token);
    if (!decoded || decoded.action !== 'review') {
      throw new NotFoundException('Token ungültig oder abgelaufen.');
    }
    const appt = await this.prisma.appointment.findUnique({
      where: { id: decoded.appointmentId },
      select: {
        id: true,
        tenantId: true,
        startAt: true,
        staff: { select: { firstName: true } },
        items: { select: { service: { select: { name: true } } } },
        client: { select: { firstName: true } },
        tenant: { select: { name: true, slug: true } },
      },
    });
    if (!appt || appt.tenantId !== decoded.tenantId) {
      throw new NotFoundException('Termin nicht gefunden.');
    }
    const existing = await this.prisma.salonReview.findFirst({
      where: { tenantId: appt.tenantId, appointmentId: appt.id },
      select: { id: true },
    });
    return {
      appointmentId: appt.id,
      tenantId: appt.tenantId,
      salonName: appt.tenant.name,
      salonSlug: appt.tenant.slug,
      staffFirstName: appt.staff.firstName,
      serviceName: appt.items.map((i) => i.service.name).join(' + '),
      appointmentDate: appt.startAt,
      alreadySubmitted: existing !== null,
      clientFirstName: appt.client?.firstName ?? '',
    };
  }

  /**
   * Submit. Validates token, dedup-Check via UNIQUE-Constraint
   * (appointmentId), schreibt SalonReview + lifetimeValue ist nicht
   * betroffen (das ist Payment-Sicht). Throws bei Doppel-Submit.
   */
  async submitReview(
    token: string,
    input: { rating: number; text: string; authorName?: string; featuredOptIn?: boolean },
  ): Promise<{ id: string; status: 'created' }> {
    const decoded = verifySelfServiceToken(token);
    if (!decoded || decoded.action !== 'review') {
      throw new NotFoundException('Token ungültig oder abgelaufen.');
    }
    if (input.rating < 1 || input.rating > 5) {
      throw new Error('Bewertung muss zwischen 1 und 5 sein.');
    }

    const appt = await this.prisma.appointment.findUnique({
      where: { id: decoded.appointmentId },
      select: {
        id: true,
        tenantId: true,
        clientId: true,
        client: { select: { firstName: true, lastName: true } },
      },
    });
    if (!appt || appt.tenantId !== decoded.tenantId) {
      throw new NotFoundException('Termin nicht gefunden.');
    }
    const authorName =
      input.authorName ??
      (appt.client ? `${appt.client.firstName} ${appt.client.lastName.charAt(0)}.` : 'Kundin');

    try {
      const review = await this.prisma.salonReview.create({
        data: {
          tenantId: appt.tenantId,
          appointmentId: appt.id,
          clientId: appt.clientId,
          authorName,
          rating: input.rating,
          text: input.text.trim(),
          featured: false,
          submittedVia: 'auto_email',
        },
      });
      return { id: review.id, status: 'created' };
    } catch (e) {
      // P2002 unique violation → schon submitted
      if (e instanceof Error && (e as { code?: string }).code === 'P2002') {
        throw new Error('Du hast bereits eine Bewertung für diesen Termin abgegeben.');
      }
      throw e;
    }
  }

  // ─── Admin methods ───────────────────────────────────────────────────────

  /**
   * Paginated list of reviews for a tenant with optional filters.
   * Returns reviews + total count + average rating + star distribution.
   */
  async listReviews(
    tenantId: string,
    filters: {
      rating?: number;
      featured?: boolean;
      source?: string;
      page: number;
      limit: number;
    },
  ): Promise<{
    reviews: SalonReview[];
    total: number;
    avgRating: number;
    distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  }> {
    const ctx = requireTenantContext();
    if (ctx.role !== 'OWNER' && ctx.role !== 'MANAGER') {
      throw new ForbiddenException('Nur OWNER oder MANAGER dürfen Reviews verwalten.');
    }

    const where: {
      tenantId: string;
      rating?: number;
      featured?: boolean;
      submittedVia?: string;
    } = { tenantId };
    if (filters.rating !== undefined) where.rating = filters.rating;
    if (filters.featured !== undefined) where.featured = filters.featured;
    if (filters.source !== undefined) where.submittedVia = filters.source;

    const skip = (filters.page - 1) * filters.limit;

    const [reviews, total, allForStats] = await Promise.all([
      this.prisma.salonReview.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: filters.limit,
      }),
      this.prisma.salonReview.count({ where }),
      this.prisma.salonReview.findMany({
        where: { tenantId },
        select: { rating: true },
      }),
    ]);

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let ratingSum = 0;
    for (const r of allForStats) {
      const star = r.rating as 1 | 2 | 3 | 4 | 5;
      distribution[star] = (distribution[star] ?? 0) + 1;
      ratingSum += r.rating;
    }
    const avgRating =
      allForStats.length > 0 ? Math.round((ratingSum / allForStats.length) * 10) / 10 : 0;

    return { reviews, total, avgRating, distribution };
  }

  /** Toggle the featured flag on a review. Scoped to tenant. */
  async toggleFeature(tenantId: string, reviewId: string, featured: boolean): Promise<SalonReview> {
    const ctx = requireTenantContext();
    if (ctx.role !== 'OWNER' && ctx.role !== 'MANAGER') {
      throw new ForbiddenException('Nur OWNER oder MANAGER dürfen Reviews featuren.');
    }

    const existing = await this.prisma.salonReview.findFirst({
      where: { id: reviewId, tenantId },
    });
    if (!existing) throw new NotFoundException('Review nicht gefunden.');

    return this.prisma.salonReview.update({
      where: { id: reviewId },
      data: { featured },
    });
  }

  /** Permanently delete a review. OWNER only. */
  async deleteReview(tenantId: string, reviewId: string): Promise<void> {
    const ctx = requireTenantContext();
    if (ctx.role !== 'OWNER') {
      throw new ForbiddenException('Nur OWNER dürfen Reviews löschen.');
    }

    const existing = await this.prisma.salonReview.findFirst({
      where: { id: reviewId, tenantId },
    });
    if (!existing) throw new NotFoundException('Review nicht gefunden.');

    await this.prisma.salonReview.delete({ where: { id: reviewId } });
  }

  /** Manually import a review (submittedVia: 'manual'). */
  async importReview(
    tenantId: string,
    input: {
      rating: number;
      text: string;
      authorName: string;
      sourceUrl?: string | null;
      source?: string | null;
    },
  ): Promise<SalonReview> {
    const ctx = requireTenantContext();
    if (ctx.role !== 'OWNER' && ctx.role !== 'MANAGER') {
      throw new ForbiddenException('Nur OWNER oder MANAGER dürfen Reviews importieren.');
    }

    return this.prisma.salonReview.create({
      data: {
        tenantId,
        authorName: input.authorName,
        rating: input.rating,
        text: input.text.trim(),
        sourceUrl: input.sourceUrl ?? null,
        featured: false,
        submittedVia: (input.source as 'manual' | 'google_import' | null) ?? 'manual',
      },
    });
  }
}
