import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient, Client } from '@salon-os/db';
import type {
  CreateClientInput,
  UpdateClientInput,
} from '@salon-os/types';
import { normalizePhone } from '@salon-os/utils';
import { AuditService } from '../audit/audit.service.js';
import { WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

@Injectable()
export class ClientsService {
  constructor(
    @Inject(WITH_TENANT) private readonly withTenant: WithTenantFn,
    private readonly audit: AuditService,
  ) {}

  async list(query?: string, limit = 50): Promise<Client[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.client.findMany({
        where: {
          deletedAt: null,
          ...(query
            ? {
                OR: [
                  { firstName: { contains: query, mode: 'insensitive' } },
                  { lastName: { contains: query, mode: 'insensitive' } },
                  { email: { contains: query, mode: 'insensitive' } },
                  { phoneE164: { contains: normalizePhone(query) } },
                ],
              }
            : {}),
        },
        orderBy: [{ lastVisitAt: 'desc' }, { lastName: 'asc' }],
        take: Math.min(limit, 5000),
      });
    });
  }

  async get(id: string): Promise<Client> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const client = await tx.client.findFirst({
        where: { id, deletedAt: null },
      });
      if (!client) throw new NotFoundException(`Client ${id} not found`);
      return client;
    });
  }

  async create(input: CreateClientInput): Promise<Client> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const created = await tx.client.create({
        data: {
          tenantId: ctx.tenantId,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email ?? null,
          phone: input.phone ?? null,
          phoneE164: input.phone ? normalizePhone(input.phone) : null,
          birthday: input.birthday ? new Date(input.birthday) : null,
          pronouns: input.pronouns ?? null,
          address: input.address ?? undefined,
          language: input.language ?? 'de-CH',
          marketingOptIn: input.marketingOptIn,
          smsOptIn: input.smsOptIn,
          emailOptIn: input.emailOptIn,
          allergies: input.allergies,
          tags: input.tags,
          preferredStaffId: input.preferredStaffId ?? null,
          source: input.source ?? null,
          notesInternal: input.notesInternal ?? null,
        },
      });
      await this.audit.withinTx(tx, ctx.tenantId, ctx.userId, {
        entity: 'Client',
        entityId: created.id,
        action: 'create',
        diff: {
          firstName: created.firstName,
          lastName: created.lastName,
          source: created.source,
        },
      });
      return created;
    });
  }

  async update(id: string, input: UpdateClientInput): Promise<Client> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.client.findFirst({
        where: { id, deletedAt: null },
      });
      if (!existing) throw new NotFoundException(`Client ${id} not found`);

      const updated = await tx.client.update({
        where: { id },
        data: {
          ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
          ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
          ...(input.email !== undefined ? { email: input.email ?? null } : {}),
          ...(input.phone !== undefined
            ? {
                phone: input.phone ?? null,
                phoneE164: input.phone ? normalizePhone(input.phone) : null,
              }
            : {}),
          ...(input.birthday !== undefined
            ? { birthday: input.birthday ? new Date(input.birthday) : null }
            : {}),
          ...(input.pronouns !== undefined ? { pronouns: input.pronouns ?? null } : {}),
          ...(input.address !== undefined ? { address: input.address ?? undefined } : {}),
          ...(input.language !== undefined ? { language: input.language } : {}),
          ...(input.marketingOptIn !== undefined
            ? { marketingOptIn: input.marketingOptIn }
            : {}),
          ...(input.smsOptIn !== undefined ? { smsOptIn: input.smsOptIn } : {}),
          ...(input.emailOptIn !== undefined ? { emailOptIn: input.emailOptIn } : {}),
          ...(input.allergies !== undefined ? { allergies: input.allergies } : {}),
          ...(input.tags !== undefined ? { tags: input.tags } : {}),
          ...(input.preferredStaffId !== undefined
            ? { preferredStaffId: input.preferredStaffId ?? null }
            : {}),
          ...(input.source !== undefined ? { source: input.source ?? null } : {}),
          ...(input.notesInternal !== undefined
            ? { notesInternal: input.notesInternal ?? null }
            : {}),
          ...((input as { blocked?: boolean }).blocked !== undefined
            ? { blocked: (input as { blocked: boolean }).blocked }
            : {}),
        },
      });

      const diff: Record<string, { from: unknown; to: unknown }> = {};
      const trackedKeys: Array<keyof typeof updated> = [
        'firstName',
        'lastName',
        'email',
        'phone',
        'birthday',
        'pronouns',
        'photoUrl',
        'address',
        'language',
        'marketingOptIn',
        'smsOptIn',
        'emailOptIn',
        'allergies',
        'tags',
        'preferredStaffId',
        'source',
        'notesInternal',
        'blocked',
      ];
      for (const k of trackedKeys) {
        const a = existing[k];
        const b = updated[k];
        if (Array.isArray(a) || Array.isArray(b)) {
          // Arrays tief via JSON vergleichen (tags, allergies).
          if (JSON.stringify(a ?? []) !== JSON.stringify(b ?? [])) {
            diff[k as string] = { from: a, to: b };
          }
          continue;
        }
        if (a instanceof Date || b instanceof Date) {
          const at = (a as Date | null)?.getTime?.() ?? null;
          const bt = (b as Date | null)?.getTime?.() ?? null;
          if (at !== bt) diff[k as string] = { from: a, to: b };
          continue;
        }
        if (a !== null && typeof a === 'object') {
          // JSON-Feld (address) tief vergleichen.
          if (JSON.stringify(a) !== JSON.stringify(b)) {
            diff[k as string] = { from: a, to: b };
          }
          continue;
        }
        if (a !== b) diff[k as string] = { from: a, to: b };
      }
      if (Object.keys(diff).length > 0) {
        await this.audit.withinTx(tx, ctx.tenantId, ctx.userId, {
          entity: 'Client',
          entityId: id,
          action: 'update',
          diff,
        });
      }
      return updated;
    });
  }

  /**
   * Bulk-Import mit Email-Dedupe pro Tenant. Rows mit existierender
   * Email werden übersprungen (nicht überschrieben). Ungültige Rows
   * sammeln wir statt alles zu canceln — so bekommt Neta einen
   * Fehlerbericht pro Zeile.
   */
  async importBulk(
    rows: CreateClientInput[],
  ): Promise<{ created: number; skipped: number; errors: { row: number; message: string }[] }> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existingEmails = new Set(
        (
          await tx.client.findMany({
            where: { email: { not: null }, deletedAt: null },
            select: { email: true },
          })
        )
          .map((c) => c.email?.toLowerCase())
          .filter((e): e is string => Boolean(e)),
      );

      let created = 0;
      let skipped = 0;
      const errors: { row: number; message: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const input = rows[i]!;
        const emailKey = input.email?.toLowerCase();
        if (emailKey && existingEmails.has(emailKey)) {
          skipped++;
          continue;
        }
        try {
          await tx.client.create({
            data: {
              tenantId: ctx.tenantId,
              firstName: input.firstName,
              lastName: input.lastName,
              email: input.email ?? null,
              phone: input.phone ?? null,
              phoneE164: input.phone ? normalizePhone(input.phone) : null,
              birthday: input.birthday ? new Date(input.birthday) : null,
              pronouns: input.pronouns ?? null,
              address: input.address ?? undefined,
              language: input.language ?? 'de-CH',
              marketingOptIn: input.marketingOptIn,
              smsOptIn: input.smsOptIn,
              emailOptIn: input.emailOptIn,
              allergies: input.allergies,
              tags: input.tags,
              preferredStaffId: input.preferredStaffId ?? null,
              source: input.source ?? 'csv-import',
              notesInternal: input.notesInternal ?? null,
            },
          });
          if (emailKey) existingEmails.add(emailKey);
          created++;
        } catch (err) {
          errors.push({
            row: i + 1,
            message: err instanceof Error ? err.message : 'Unbekannter Fehler',
          });
        }
      }

      return { created, skipped, errors };
    });
  }

  async softDelete(id: string): Promise<void> {
    const ctx = requireTenantContext();
    await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      await tx.client.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await this.audit.withinTx(tx, ctx.tenantId, ctx.userId, {
        entity: 'Client',
        entityId: id,
        action: 'soft-delete',
      });
    });
  }

  /**
   * 1-Klick-DSGVO-Export: alle personenbezogenen Daten einer Kundin
   * als JSON. Enthält Profil, Termine (inkl. Items + Services), alle
   * Notizen, Buchungskanal-Historie.
   *
   * (Diff #31)
   */
  async exportPersonalData(id: string): Promise<unknown> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const client = await tx.client.findFirst({ where: { id } });
      if (!client) throw new NotFoundException(`Client ${id} not found`);
      const appointments = await tx.appointment.findMany({
        where: { clientId: id },
        orderBy: { startAt: 'desc' },
        include: {
          items: {
            include: { service: { select: { name: true, slug: true } } },
          },
          staff: { select: { firstName: true, lastName: true } },
          location: { select: { name: true } },
        },
      });
      const totalSpent = appointments
        .filter((a) => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW')
        .reduce(
          (sum, a) => sum + a.items.reduce((s, i) => s + Number(i.price), 0),
          0,
        );
      return {
        exportedAt: new Date().toISOString(),
        basisGdpr: 'EU GDPR Art. 15 / Swiss DSG Art. 25',
        client,
        appointments,
        totals: {
          totalAppointments: appointments.length,
          totalVisits: client.totalVisits,
          totalSpent,
          lastVisitAt: client.lastVisitAt,
        },
      };
    });
  }

  /**
   * Forget-me: markiert den Client als zu löschen. Echte Löschung via
   * Cron-Job in 30 Tagen (Spec: `specs/compliance.md`). MVP: sofort
   * Soft-Delete + Log.
   */
  async requestDeletion(id: string, reason?: string): Promise<void> {
    const ctx = requireTenantContext();
    await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.client.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException(`Client ${id} not found`);
      await tx.client.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          notesInternal: `[DSGVO-Löschung angefragt ${new Date().toISOString()}${
            reason ? ': ' + reason : ''
          }]\n\n${existing.notesInternal ?? ''}`,
        },
      });
      await this.audit.withinTx(tx, ctx.tenantId, ctx.userId, {
        entity: 'Client',
        entityId: id,
        action: 'gdpr-forget',
        diff: { reason: reason ?? null },
      });
    });
  }
}

