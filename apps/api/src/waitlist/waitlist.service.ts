import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient, WaitlistEntry } from '@salon-os/db';
import { WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

export interface PublicWaitlistInput {
  serviceId: string;
  locationId: string;
  preferredStaffId?: string | null;
  earliestAt: string;
  latestAt: string;
  notes?: string;
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

@Injectable()
export class WaitlistService {
  constructor(
    @Inject(WITH_TENANT) private readonly withTenant: WithTenantFn,
    @Inject('PRISMA_PUBLIC') private readonly prismaPublic: PrismaClient,
  ) {}

  /**
   * Admin-seitiger Eintrag (Telefon-Anruf: „Kannst du mich eintragen
   * falls Fr frei wird?"). clientId falls bestehende Kundin, sonst
   * firstName/lastName/email → anlegen oder dedupen.
   */
  async adminAdd(input: {
    serviceId: string;
    locationId: string;
    preferredStaffId?: string | null;
    earliestAt: string;
    latestAt: string;
    notes?: string;
    clientId?: string;
    newClient?: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
    };
  }): Promise<WaitlistEntry> {
    const ctx = requireTenantContext();
    const earliest = new Date(input.earliestAt);
    const latest = new Date(input.latestAt);
    if (!(latest > earliest)) {
      throw new BadRequestException('latestAt muss nach earliestAt liegen.');
    }
    if (!input.clientId && !input.newClient) {
      throw new BadRequestException(
        'Entweder clientId oder newClient-Daten angeben.',
      );
    }

    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      let clientId = input.clientId;
      if (!clientId && input.newClient) {
        const created = await tx.client.create({
          data: {
            tenantId: ctx.tenantId,
            firstName: input.newClient.firstName,
            lastName: input.newClient.lastName,
            email: input.newClient.email ?? null,
            phone: input.newClient.phone ?? null,
            source: 'waitlist-admin',
          },
        });
        clientId = created.id;
      }
      return tx.waitlistEntry.create({
        data: {
          tenantId: ctx.tenantId,
          clientId: clientId!,
          serviceId: input.serviceId,
          locationId: input.locationId,
          preferredStaffId: input.preferredStaffId ?? null,
          earliestAt: earliest,
          latestAt: latest,
          notes: input.notes ?? null,
        },
      });
    });
  }

  async listActive(): Promise<WaitlistEntry[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.waitlistEntry.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { earliestAt: 'asc' },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              phoneE164: true,
            },
          },
          service: { select: { name: true } },
          staff: { select: { firstName: true, lastName: true } },
        },
      });
    });
  }

  async publicAdd(slug: string, input: PublicWaitlistInput): Promise<WaitlistEntry> {
    const tenant = await this.prismaPublic.tenant.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });
    if (!tenant || tenant.status === 'SUSPENDED' || tenant.status === 'CANCELLED') {
      throw new NotFoundException('Unknown tenant');
    }
    const earliest = new Date(input.earliestAt);
    const latest = new Date(input.latestAt);
    if (!(latest > earliest)) {
      throw new BadRequestException('latestAt muss nach earliestAt liegen.');
    }

    return this.withTenant(tenant.id, null, null, async (tx) => {
      const existingClient = await tx.client.findFirst({
        where: {
          OR: [
            { email: input.client.email },
            ...(input.client.phone ? [{ phone: input.client.phone }] : []),
          ],
          deletedAt: null,
        },
      });
      const client = existingClient
        ?? (await tx.client.create({
          data: {
            tenantId: tenant.id,
            firstName: input.client.firstName,
            lastName: input.client.lastName,
            email: input.client.email,
            phone: input.client.phone ?? null,
            source: 'waitlist',
          },
        }));

      return tx.waitlistEntry.create({
        data: {
          tenantId: tenant.id,
          clientId: client.id,
          serviceId: input.serviceId,
          locationId: input.locationId,
          preferredStaffId: input.preferredStaffId ?? null,
          earliestAt: earliest,
          latestAt: latest,
          notes: input.notes ?? null,
        },
      });
    });
  }

  async setStatus(
    id: string,
    status: 'FULFILLED' | 'EXPIRED' | 'CANCELLED',
  ): Promise<WaitlistEntry> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.waitlistEntry.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException('Eintrag nicht gefunden.');
      return tx.waitlistEntry.update({
        where: { id },
        data: { status },
      });
    });
  }
}
