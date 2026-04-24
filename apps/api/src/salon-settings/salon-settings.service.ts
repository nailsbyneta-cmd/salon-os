import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient, SalonFAQ, SalonGalleryImage, SalonReview, Tenant } from '@salon-os/db';
import { WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

export interface BrandingInput {
  tagline?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  brandColor?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  whatsappE164?: string | null;
  googleBusinessUrl?: string | null;
}

@Injectable()
export class SalonSettingsService {
  constructor(@Inject(WITH_TENANT) private readonly withTenant: WithTenantFn) {}

  async getTenant(): Promise<Tenant> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const t = await tx.tenant.findUnique({ where: { id: ctx.tenantId } });
      if (!t) throw new NotFoundException('Tenant not found');
      return t;
    });
  }

  async updateSettings(input: Record<string, unknown>): Promise<Tenant> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const current = await tx.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { settings: true },
      });
      const currentSettings =
        current?.settings && typeof current.settings === 'object'
          ? (current.settings as Record<string, unknown>)
          : {};
      // Deep merge — groups (booking/notifications/features) werden
      // zusammengeführt, einzelne Keys innerhalb überschreiben.
      const merged: Record<string, unknown> = { ...currentSettings };
      for (const [k, v] of Object.entries(input)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          merged[k] = {
            ...((currentSettings[k] as Record<string, unknown> | undefined) ?? {}),
            ...(v as Record<string, unknown>),
          };
        } else if (v !== undefined) {
          merged[k] = v;
        }
      }
      return tx.tenant.update({
        where: { id: ctx.tenantId },
        data: { settings: merged as never },
      });
    });
  }

  async updateBranding(input: BrandingInput): Promise<Tenant> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.tenant.update({
        where: { id: ctx.tenantId },
        data: {
          ...(input.tagline !== undefined ? { tagline: input.tagline || null } : {}),
          ...(input.description !== undefined ? { description: input.description || null } : {}),
          ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl || null } : {}),
          ...(input.heroImageUrl !== undefined ? { heroImageUrl: input.heroImageUrl || null } : {}),
          ...(input.brandColor !== undefined ? { brandColor: input.brandColor || null } : {}),
          ...(input.instagramUrl !== undefined ? { instagramUrl: input.instagramUrl || null } : {}),
          ...(input.facebookUrl !== undefined ? { facebookUrl: input.facebookUrl || null } : {}),
          ...(input.tiktokUrl !== undefined ? { tiktokUrl: input.tiktokUrl || null } : {}),
          ...(input.whatsappE164 !== undefined ? { whatsappE164: input.whatsappE164 || null } : {}),
          ...(input.googleBusinessUrl !== undefined
            ? { googleBusinessUrl: input.googleBusinessUrl || null }
            : {}),
        },
      });
    });
  }

  // ─── FAQ ─────────────────────────────────────────────

  async listFaqs(): Promise<SalonFAQ[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, (tx) =>
      tx.salonFAQ.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }),
    );
  }

  async createFaq(input: { question: string; answer: string; order?: number }): Promise<SalonFAQ> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, (tx) =>
      tx.salonFAQ.create({
        data: {
          tenantId: ctx.tenantId,
          question: input.question,
          answer: input.answer,
          order: input.order ?? 0,
        },
      }),
    );
  }

  async updateFaq(
    id: string,
    input: {
      question?: string;
      answer?: string;
      order?: number;
      active?: boolean;
    },
  ): Promise<SalonFAQ> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, (tx) =>
      tx.salonFAQ.update({ where: { id }, data: input }),
    );
  }

  async deleteFaq(id: string): Promise<void> {
    const ctx = requireTenantContext();
    await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, (tx) =>
      tx.salonFAQ.delete({ where: { id } }),
    );
  }

  // ─── Reviews ─────────────────────────────────────────

  async listReviews(): Promise<SalonReview[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, (tx) =>
      tx.salonReview.findMany({
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      }),
    );
  }

  async createReview(input: {
    authorName: string;
    rating: number;
    text: string;
    sourceUrl?: string | null;
    featured?: boolean;
  }): Promise<SalonReview> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, (tx) =>
      tx.salonReview.create({
        data: {
          tenantId: ctx.tenantId,
          authorName: input.authorName,
          rating: input.rating,
          text: input.text,
          sourceUrl: input.sourceUrl ?? null,
          featured: input.featured ?? false,
        },
      }),
    );
  }

  async updateReview(
    id: string,
    input: {
      authorName?: string;
      rating?: number;
      text?: string;
      sourceUrl?: string | null;
      featured?: boolean;
    },
  ): Promise<SalonReview> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, (tx) =>
      tx.salonReview.update({ where: { id }, data: input }),
    );
  }

  async deleteReview(id: string): Promise<void> {
    const ctx = requireTenantContext();
    await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, (tx) =>
      tx.salonReview.delete({ where: { id } }),
    );
  }

  // ─── Gallery ─────────────────────────────────────────

  async listGallery(): Promise<SalonGalleryImage[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, (tx) =>
      tx.salonGalleryImage.findMany({
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      }),
    );
  }

  async createGalleryImage(input: {
    imageUrl: string;
    caption?: string | null;
    order?: number;
  }): Promise<SalonGalleryImage> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, (tx) =>
      tx.salonGalleryImage.create({
        data: {
          tenantId: ctx.tenantId,
          imageUrl: input.imageUrl,
          caption: input.caption ?? null,
          order: input.order ?? 0,
        },
      }),
    );
  }

  async updateGalleryImage(
    id: string,
    input: { imageUrl?: string; caption?: string | null; order?: number },
  ): Promise<SalonGalleryImage> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, (tx) =>
      tx.salonGalleryImage.update({ where: { id }, data: input }),
    );
  }

  async deleteGalleryImage(id: string): Promise<void> {
    const ctx = requireTenantContext();
    await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, (tx) =>
      tx.salonGalleryImage.delete({ where: { id } }),
    );
  }
}
