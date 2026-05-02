import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OutboxEvent, PrismaClient } from '@salon-os/db';
import { decryptSecret } from '@salon-os/utils/crypto';
import { signSelfServiceToken } from '@salon-os/utils';
import { PRISMA } from '../db/db.module.js';
import { EmailService } from '../email/email.service.js';
import {
  birthdayEmail,
  cancelEmail,
  confirmationEmail,
  magicLinkEmail,
  rebookEmail,
  reminder24hEmail,
  reviewRequestEmail,
  waitlistSlotEmail,
  winbackEmail,
  type ApptForEmail,
  type ClientForEmail,
  type TenantForEmail,
} from './templates.js';
import { generateIcsBase64 } from './ics.js';
import { uploadClickConversion } from '../ads-integration/google-ads.client.js';

const MAX_ATTEMPTS = 5;
/** Reminder.24h darf erst kurz vor (startAt - leadTime) raus. */
const REMINDER_24H_LEAD_MS = 24 * 60 * 60 * 1000;

interface ProcessResult {
  picked: number;
  done: number;
  failed: number;
  skipped: number;
}

interface ReminderPayload {
  appointmentId?: string;
  tenantId: string;
  startAt?: string;
  leadTimeMs?: number;
  clientId?: string;
  magicToken?: string;
  tenantSlug?: string;
}

interface AdsConversionPayload {
  appointmentId: string;
  /** Key in tenant_ads_integration.conversionActions, z.B. 'booking_completed'. */
  event: string;
}

interface WaitlistSlotPayload {
  clientId: string;
  clientEmail: string;
  clientName: string | null;
  serviceName: string;
  slotStartAt: string;
  waitlistEntryId: string;
  tenantSlug?: string;
}

/**
 * Outbox-Consumer. Drain-Pattern: poll PENDING events, dispatch by type,
 * mark DONE/FAILED with attempts. Cross-Tenant via PRISMA (RLS-bypass)
 * weil cron-getrieben.
 *
 * Triggern via POST /v1/cron/outbox/process — Railway-Cron alle 1-2 Min.
 */
@Injectable()
export class OutboxWorkerService {
  private readonly logger = new Logger(OutboxWorkerService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly email: EmailService,
  ) {}

  async processOnce(batchSize = 50): Promise<ProcessResult> {
    const result: ProcessResult = { picked: 0, done: 0, failed: 0, skipped: 0 };

    // Atomic claim: select + mark PROCESSING in one tx so parallel workers
    // don't double-process. Postgres FOR UPDATE SKIP LOCKED idiom.
    const claimed = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<OutboxEvent[]>(
        `SELECT * FROM outbox_event
         WHERE status = 'PENDING'
         ORDER BY "createdAt" ASC
         LIMIT ${Math.max(1, Math.min(batchSize, 200))}
         FOR UPDATE SKIP LOCKED`,
      );
      if (rows.length === 0) return [];
      const ids = rows.map((r) => r.id);
      await tx.outboxEvent.updateMany({
        where: { id: { in: ids } },
        data: { status: 'PROCESSING' },
      });
      return rows;
    });

    result.picked = claimed.length;
    if (claimed.length === 0) return result;

    for (const ev of claimed) {
      try {
        const action = await this.dispatch(ev);
        if (action === 'skip') {
          // re-queue: setze auf PENDING zurück, ohne attempts++
          await this.prisma.outboxEvent.update({
            where: { id: ev.id },
            data: { status: 'PENDING' },
          });
          result.skipped += 1;
        } else {
          await this.prisma.outboxEvent.update({
            where: { id: ev.id },
            data: {
              status: 'DONE',
              processedAt: new Date(),
              attempts: { increment: 1 },
              lastError: null,
            },
          });
          result.done += 1;
        }
      } catch (err) {
        const msg = (err as Error).message ?? String(err);
        const nextAttempts = ev.attempts + 1;
        const isFinal = nextAttempts >= MAX_ATTEMPTS;
        await this.prisma.outboxEvent.update({
          where: { id: ev.id },
          data: {
            status: isFinal ? 'FAILED' : 'PENDING',
            attempts: nextAttempts,
            lastError: msg.slice(0, 1000),
          },
        });
        if (isFinal) result.failed += 1;
        else result.skipped += 1;
        this.logger.error(`Event ${ev.id} (${ev.type}) failed attempt ${nextAttempts}: ${msg}`);
      }
    }
    return result;
  }

  /** Returns 'skip' if the event isn't due yet (re-queue). */
  private async dispatch(ev: OutboxEvent): Promise<'done' | 'skip'> {
    const payload = (ev.payload ?? {}) as unknown as ReminderPayload;
    switch (ev.type) {
      case 'reminder.confirmation':
        await this.handleReminder(ev, payload, 'confirmation');
        return 'done';
      case 'reminder.24h': {
        if (payload.startAt) {
          const lead = payload.leadTimeMs ?? REMINDER_24H_LEAD_MS;
          const sendAt = new Date(payload.startAt).getTime() - lead;
          if (Date.now() < sendAt) return 'skip';
        }
        await this.handleReminder(ev, payload, 'reminder24h');
        return 'done';
      }
      case 'reminder.cancel':
        await this.handleReminder(ev, payload, 'cancel');
        return 'done';
      case 'marketing.winback':
        await this.handleWinback(ev, payload);
        return 'done';
      case 'auth.magic_link':
        await this.handleMagicLink(ev, payload);
        return 'done';
      case 'review.request':
        await this.handleReviewRequest(ev, payload);
        return 'done';
      case 'google_ads.upload_conversion':
        await this.handleAdsConversionUpload(ev, payload as unknown as AdsConversionPayload);
        return 'done';
      case 'marketing.rebook':
        await this.handleMarketingClient(ev, payload, 'rebook');
        return 'done';
      case 'marketing.birthday':
        await this.handleMarketingClient(ev, payload, 'birthday');
        return 'done';
      case 'waitlist.slot_available':
        await this.handleWaitlistSlot(ev, payload as unknown as WaitlistSlotPayload);
        return 'done';
      default:
        this.logger.warn(`unknown outbox event type: ${ev.type}`);
        return 'done';
    }
  }

  private async handleReminder(
    ev: OutboxEvent,
    payload: ReminderPayload,
    kind: 'confirmation' | 'reminder24h' | 'cancel',
  ): Promise<void> {
    if (!payload.appointmentId) {
      throw new Error('appointmentId missing in payload');
    }
    const data = await this.loadAppointmentData(payload.appointmentId);
    if (!data) {
      // Appointment gelöscht / Tenant gekippt — silent done, nicht endlos retry.
      this.logger.warn(`appt ${payload.appointmentId} not found — drop event`);
      return;
    }
    const { appt, client, tenant } = data;
    if (!client.email) {
      this.logger.warn(`appt ${payload.appointmentId} client has no email — drop`);
      return;
    }
    const tpl =
      kind === 'confirmation'
        ? confirmationEmail(appt, client, tenant)
        : kind === 'reminder24h'
          ? reminder24hEmail(appt, client, tenant)
          : cancelEmail(appt, client, tenant);

    // ICS-Anhang nur bei Confirmation + Reminder. Apple/Google Calendar
    // erkennen text/calendar-Attachment und bieten "Zum Kalender"-Button.
    const attachments =
      kind === 'cancel'
        ? undefined
        : [
            {
              filename: 'termin.ics',
              contentType: 'text/calendar; charset=utf-8; method=REQUEST',
              content: generateIcsBase64({
                uid: payload.appointmentId!,
                summary: `${tenant.name} — ${appt.items.map((i) => i.service.name).join(' + ')}`,
                description: `Termin bei ${appt.staff.firstName}\n${appt.location.name}`,
                location: appt.location.name,
                startUtc: appt.startAt,
                endUtc: appt.endAt ?? new Date(appt.startAt.getTime() + 60 * 60_000),
                organizerName: tenant.name,
              }),
            },
          ];

    const res = await this.email.send({
      to: client.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      tag: `${ev.type}|${ev.tenantId ?? 'unknown'}`,
      attachments,
    });
    if (!res.ok) {
      throw new Error(res.error ?? 'email_send_failed');
    }
  }

  private async handleMagicLink(ev: OutboxEvent, payload: ReminderPayload): Promise<void> {
    if (!payload.clientId || !payload.magicToken || !payload.tenantSlug) {
      throw new Error('clientId, magicToken or tenantSlug missing in magic-link payload');
    }
    const row = await this.prisma.client.findUnique({
      where: { id: payload.clientId },
      select: {
        firstName: true,
        email: true,
        deletedAt: true,
        tenant: { select: { name: true, slug: true } },
      },
    });
    if (!row || !row.tenant || row.deletedAt) {
      this.logger.warn(`magic-link: client ${payload.clientId} not found / deleted — drop`);
      return;
    }
    if (!row.email) {
      this.logger.warn(`magic-link: client ${payload.clientId} has no email — drop`);
      return;
    }
    const publicUrl = process.env['PUBLIC_BOOKING_URL_BASE'] ?? 'https://salon-os.app/book';
    const loginUrl = `${publicUrl}/${row.tenant.slug}/me/login?token=${encodeURIComponent(payload.magicToken)}`;
    const tpl = magicLinkEmail(
      { firstName: row.firstName, email: row.email },
      row.tenant,
      loginUrl,
    );
    const res = await this.email.send({
      to: row.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      tag: `auth.magic_link|${ev.tenantId ?? 'unknown'}`,
    });
    if (!res.ok) {
      throw new Error(res.error ?? 'email_send_failed');
    }
  }

  /**
   * Birthday + Rebook nutzen denselben Pfad: Client laden, opt-in checken,
   * Mail mit dem passenden Template. Idempotency-Cooldown wird VOM
   * marketing-service vor enqueue durchgesetzt — hier kein Re-Check.
   */
  private async handleMarketingClient(
    ev: OutboxEvent,
    payload: ReminderPayload,
    kind: 'birthday' | 'rebook',
  ): Promise<void> {
    if (!payload.clientId) {
      throw new Error(`clientId missing in marketing.${kind} payload`);
    }
    const row = await this.prisma.client.findUnique({
      where: { id: payload.clientId },
      select: {
        firstName: true,
        email: true,
        emailOptIn: true,
        marketingOptIn: true,
        deletedAt: true,
        tenant: { select: { name: true, slug: true } },
      },
    });
    if (!row || !row.tenant || row.deletedAt) {
      this.logger.warn(`marketing.${kind}: client ${payload.clientId} gone — drop`);
      return;
    }
    if (!row.emailOptIn || !row.marketingOptIn) {
      this.logger.warn(`marketing.${kind}: client ${payload.clientId} opted-out — drop`);
      return;
    }
    if (!row.email) {
      this.logger.warn(`marketing.${kind}: client ${payload.clientId} no email — drop`);
      return;
    }
    const publicUrl = process.env['PUBLIC_BOOKING_URL_BASE'] ?? 'https://salon-os.app/book';
    const bookingUrl = `${publicUrl}/${row.tenant.slug}`;
    const tpl =
      kind === 'birthday'
        ? birthdayEmail({ firstName: row.firstName, email: row.email }, row.tenant, bookingUrl)
        : rebookEmail({ firstName: row.firstName, email: row.email }, row.tenant, bookingUrl);
    const res = await this.email.send({
      to: row.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      tag: `marketing.${kind}|${ev.tenantId ?? 'unknown'}`,
    });
    if (!res.ok) {
      throw new Error(res.error ?? 'email_send_failed');
    }
  }

  private async handleWinback(ev: OutboxEvent, payload: ReminderPayload): Promise<void> {
    if (!payload.clientId) {
      throw new Error('clientId missing in winback payload');
    }
    const row = await this.prisma.client.findUnique({
      where: { id: payload.clientId },
      select: {
        firstName: true,
        email: true,
        emailOptIn: true,
        marketingOptIn: true,
        deletedAt: true,
        tenant: { select: { name: true, slug: true } },
      },
    });
    if (!row || !row.tenant || row.deletedAt) {
      this.logger.warn(`winback: client ${payload.clientId} not found / deleted — drop`);
      return;
    }
    if (!row.email) {
      this.logger.warn(`winback: client ${payload.clientId} has no email — drop`);
      return;
    }
    if (!row.emailOptIn || !row.marketingOptIn) {
      this.logger.warn(`winback: client ${payload.clientId} opted-out — drop`);
      return;
    }
    const publicUrl = process.env['PUBLIC_BOOKING_URL_BASE'] ?? 'https://salon-os.app/book';
    const bookingUrl = `${publicUrl}/${row.tenant.slug}`;
    const tpl = winbackEmail(
      { firstName: row.firstName, email: row.email },
      row.tenant,
      bookingUrl,
    );
    const res = await this.email.send({
      to: row.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      tag: `marketing.winback|${ev.tenantId ?? 'unknown'}`,
    });
    if (!res.ok) {
      throw new Error(res.error ?? 'email_send_failed');
    }
  }

  /**
   * Reviews-Automation. Lädt Termin + Kundin + Tenant, generiert HMAC-
   * Review-Token (30d gültig), versendet Review-Request-Email.
   *
   * Idempotency: Wenn bereits SalonReview für appointmentId existiert,
   * silently drop. Wenn Termin gelöscht/cancelled — drop.
   */
  private async handleReviewRequest(ev: OutboxEvent, payload: ReminderPayload): Promise<void> {
    if (!payload.appointmentId) {
      throw new Error('appointmentId missing in review.request payload');
    }
    const data = await this.loadAppointmentData(payload.appointmentId);
    if (!data) {
      this.logger.warn(`review.request: appt ${payload.appointmentId} gone — drop`);
      return;
    }
    const { appt, client, tenant } = data;
    if (!client.email) {
      this.logger.warn(`review.request: appt ${payload.appointmentId} no email — drop`);
      return;
    }
    // Dedup: existiert schon Review?
    const existingReview = await this.prisma.salonReview.findFirst({
      where: { tenantId: ev.tenantId ?? '', appointmentId: payload.appointmentId },
      select: { id: true },
    });
    if (existingReview) {
      this.logger.log(`review.request: ${payload.appointmentId} already reviewed — drop`);
      return;
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const token = signSelfServiceToken({
      action: 'review',
      appointmentId: payload.appointmentId,
      tenantId: ev.tenantId ?? '',
      expiresAt,
    });
    const webBase = process.env['PUBLIC_WEB_URL_BASE'] ?? 'https://salon-os.app';
    const reviewUrl = `${webBase}/book/${tenant.slug}/review/${encodeURIComponent(token)}`;

    const tpl = reviewRequestEmail(appt, client, tenant, reviewUrl);
    const res = await this.email.send({
      to: client.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      tag: `review.request|${ev.tenantId ?? 'unknown'}`,
    });
    if (!res.ok) {
      throw new Error(res.error ?? 'email_send_failed');
    }
  }

  /**
   * Capability 2: Server-Side Google-Ads Conversion-Upload.
   *
   * Strategie:
   *   1. Booking laden (incl. tenant + client + items)
   *   2. tenant_ads_integration laden, prüfen ob enabled + conversion-action
   *      für `event` gemappt ist
   *   3. uploadClickConversion mit GCLID (preferred) oder hashed-Email
   *      (Enhanced-Conv-Fallback)
   *   4. Bei Erfolg: appointment.conversionUploadedAt + Response speichern
   *      → idempotent, nächster Worker-Tick sieht "schon hochgeladen" und macht no-op
   */
  private async handleAdsConversionUpload(
    _ev: OutboxEvent,
    payload: AdsConversionPayload,
  ): Promise<void> {
    if (!payload.appointmentId || !payload.event) {
      throw new Error('appointmentId or event missing in google_ads.upload_conversion payload');
    }

    const appt = await this.prisma.appointment.findUnique({
      where: { id: payload.appointmentId },
      select: {
        id: true,
        tenantId: true,
        startAt: true,
        bookedAt: true,
        attributionGclid: true,
        conversionUploadedAt: true,
        items: { select: { price: true } },
        location: { select: { currency: true } },
        client: { select: { email: true, phoneE164: true } },
      },
    });
    if (!appt) {
      this.logger.warn(`ads-conv: appointment ${payload.appointmentId} gone — drop`);
      return;
    }
    if (appt.conversionUploadedAt) {
      this.logger.log(`ads-conv: ${appt.id} already uploaded — skip`);
      return;
    }
    const integration = await this.prisma.tenantAdsIntegration.findFirst({
      where: { tenantId: appt.tenantId, provider: 'google_ads', enabled: true },
    });
    if (!integration) {
      this.logger.log(`ads-conv: no integration for tenant ${appt.tenantId} — skip`);
      return;
    }

    const map = (integration.conversionActions ?? {}) as Record<string, unknown>;
    const rawAction = map[payload.event];
    const action =
      typeof rawAction === 'string'
        ? rawAction
        : typeof rawAction === 'object' && rawAction !== null
          ? ((rawAction as { sendTo?: string }).sendTo ?? null)
          : null;
    if (!action) {
      this.logger.log(
        `ads-conv: tenant ${appt.tenantId} hat kein mapping für event=${payload.event} — skip`,
      );
      return;
    }

    const clientId = process.env['GOOGLE_ADS_CLIENT_ID'] ?? '';
    const clientSecret = process.env['GOOGLE_ADS_CLIENT_SECRET'] ?? '';
    const developerToken = process.env['GOOGLE_ADS_DEVELOPER_TOKEN'] ?? '';
    if (!clientId || !clientSecret || !developerToken) {
      this.logger.warn('ads-conv: GOOGLE_ADS_* env-vars fehlen — skip');
      return;
    }

    let refreshToken: string;
    try {
      refreshToken = decryptSecret(integration.refreshTokenEncrypted);
    } catch (e) {
      this.logger.error(
        `ads-conv: decrypt refresh-token failed for tenant ${appt.tenantId}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return;
    }

    const valueChf = appt.items.reduce((sum, i) => sum + Number(i.price), 0);

    const result = await uploadClickConversion(
      {
        tenantId: appt.tenantId,
        customerId: integration.customerId,
        loginCustomerId: integration.loginCustomerId,
        refreshToken,
        clientId,
        clientSecret,
        developerToken,
      },
      {
        conversionAction: action,
        gclid: appt.attributionGclid,
        email: appt.client?.email ?? null,
        phoneE164: appt.client?.phoneE164 ?? null,
        valueChf,
        bookedAt: appt.bookedAt,
        orderId: appt.id,
      },
    );

    if (!result.ok) {
      throw new Error(`ads upload failed: ${result.error}`);
    }

    await this.prisma.appointment.update({
      where: { id: appt.id },
      data: {
        conversionUploadedAt: new Date(),
        conversionUploadResponse: result.raw as object,
      },
    });
  }

  private async handleWaitlistSlot(ev: OutboxEvent, payload: WaitlistSlotPayload): Promise<void> {
    if (!payload.clientId || !payload.clientEmail) {
      throw new Error('clientId or clientEmail missing in waitlist.slot_available payload');
    }
    const client = await this.prisma.client.findUnique({
      where: { id: payload.clientId },
      select: {
        firstName: true,
        email: true,
        emailOptIn: true,
        deletedAt: true,
        tenant: { select: { name: true, slug: true } },
      },
    });
    if (!client || !client.tenant || client.deletedAt) {
      this.logger.warn(`waitlist.slot_available: client ${payload.clientId} gone — drop`);
      return;
    }
    if (!client.emailOptIn) {
      this.logger.warn(`waitlist.slot_available: client ${payload.clientId} opted-out — drop`);
      return;
    }
    // Always use the live DB email — never trust payload-supplied email addresses
    // to prevent email spoofing if an attacker can inject outbox events.
    if (!client.email) {
      this.logger.warn(`waitlist.slot_available: client ${payload.clientId} no email — drop`);
      return;
    }
    const email = client.email;
    const publicUrl = process.env['PUBLIC_BOOKING_URL_BASE'] ?? 'https://salon-os.app/book';
    const bookingUrl = `${publicUrl}/${client.tenant.slug}`;
    const slotDate = new Date(payload.slotStartAt);
    const tpl = waitlistSlotEmail(
      { firstName: client.firstName, email },
      client.tenant,
      payload.serviceName,
      slotDate,
      bookingUrl,
    );
    const res = await this.email.send({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      tag: `waitlist.slot_available|${ev.tenantId ?? 'unknown'}`,
    });
    if (!res.ok) {
      throw new Error(res.error ?? 'email_send_failed');
    }
  }

  private async loadAppointmentData(appointmentId: string): Promise<{
    appt: ApptForEmail;
    client: ClientForEmail;
    tenant: TenantForEmail;
  } | null> {
    const row = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        startAt: true,
        endAt: true,
        location: { select: { name: true } },
        staff: { select: { firstName: true } },
        items: { select: { service: { select: { name: true } }, optionLabels: true } },
        client: { select: { firstName: true, email: true } },
        tenant: { select: { name: true, slug: true } },
      },
    });
    if (!row || !row.client || !row.location || !row.staff || !row.tenant) return null;
    return {
      appt: {
        startAt: row.startAt,
        endAt: row.endAt,
        location: row.location,
        staff: row.staff,
        items: row.items,
      },
      client: row.client,
      tenant: row.tenant,
    };
  }
}
