import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient, Client } from '@salon-os/db';
import type {
  CreateClientInput,
  UpdateClientInput,
} from '@salon-os/types';
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
  constructor(@Inject(WITH_TENANT) private readonly withTenant: WithTenantFn) {}

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
        take: Math.min(limit, 200),
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
      return tx.client.create({
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
    });
  }

  async update(id: string, input: UpdateClientInput): Promise<Client> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.client.findFirst({
        where: { id, deletedAt: null },
      });
      if (!existing) throw new NotFoundException(`Client ${id} not found`);

      return tx.client.update({
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
        },
      });
    });
  }

  async softDelete(id: string): Promise<void> {
    const ctx = requireTenantContext();
    await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      await tx.client.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }
}

/**
 * Minimaler Phone-Normalisierer für Phase 1.
 * Wird in Phase 2 durch `libphonenumber-js` in @salon-os/utils ersetzt.
 * Regel: alles ausser `+` und Ziffern entfernen.
 */
function normalizePhone(input: string): string {
  const cleaned = input.replace(/[^\d+]/g, '');
  // Für CH: führende 0 durch +41 ersetzen
  if (cleaned.startsWith('0')) return '+41' + cleaned.slice(1);
  return cleaned;
}
