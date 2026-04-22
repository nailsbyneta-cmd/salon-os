import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { SalonSettingsService } from './salon-settings.service.js';

vi.mock('../tenant/tenant.context.js', () => ({
  requireTenantContext: () => ({ tenantId: 'tenant1', userId: 'user1', role: 'ADMIN' }),
}));

function makePrisma() {
  return {
    tenant: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: 'tenant1' }),
    },
    salonFAQ: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'faq1' }),
      update: vi.fn().mockResolvedValue({ id: 'faq1' }),
      delete: vi.fn().mockResolvedValue({}),
    },
    salonReview: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'rev1' }),
      update: vi.fn().mockResolvedValue({ id: 'rev1' }),
      delete: vi.fn().mockResolvedValue({}),
    },
    salonGalleryImage: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'img1' }),
      update: vi.fn().mockResolvedValue({ id: 'img1' }),
      delete: vi.fn().mockResolvedValue({}),
    },
  };
}

function makeWithTenant(prisma: ReturnType<typeof makePrisma>) {
  return vi.fn((_tid: string, _uid: string | null, _role: string | null, fn: (tx: unknown) => Promise<unknown>) =>
    fn(prisma),
  );
}

describe('SalonSettingsService', () => {
  let service: SalonSettingsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new SalonSettingsService(makeWithTenant(prisma) as never);
  });

  // ── getTenant() ───────────────────────────────────────────────────────────

  describe('getTenant()', () => {
    it('throws NotFoundException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.getTenant()).rejects.toThrow(NotFoundException);
    });

    it('returns tenant when found', async () => {
      const tenant = { id: 'tenant1', name: 'Demo Salon' };
      prisma.tenant.findUnique.mockResolvedValue(tenant);
      const result = await service.getTenant();
      expect(result).toEqual(tenant);
    });
  });

  // ── updateBranding() ──────────────────────────────────────────────────────

  describe('updateBranding()', () => {
    it('updates only provided fields', async () => {
      await service.updateBranding({ tagline: 'Neue Tagline' });
      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tagline: 'Neue Tagline' }) }),
      );
    });

    it('converts empty string to null', async () => {
      await service.updateBranding({ tagline: '' });
      const call = prisma.tenant.update.mock.calls[0]![0] as { data: { tagline: null } };
      expect(call.data.tagline).toBeNull();
    });

    it('does not include fields not in input', async () => {
      await service.updateBranding({ tagline: 'X' });
      const call = prisma.tenant.update.mock.calls[0]![0] as { data: Record<string, unknown> };
      expect(call.data).not.toHaveProperty('logoUrl');
    });

    it('updates tenant by tenantId from context', async () => {
      await service.updateBranding({ tagline: 'X' });
      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tenant1' } }),
      );
    });
  });

  // ── FAQ CRUD ──────────────────────────────────────────────────────────────

  describe('listFaqs()', () => {
    it('returns faqs ordered by order then createdAt', async () => {
      await service.listFaqs();
      expect(prisma.salonFAQ.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }),
      );
    });
  });

  describe('createFaq()', () => {
    it('creates faq with tenantId and default order 0', async () => {
      await service.createFaq({ question: 'Habt ihr Parking?', answer: 'Ja.' });
      expect(prisma.salonFAQ.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: 'tenant1', order: 0 }),
        }),
      );
    });

    it('uses provided order when given', async () => {
      await service.createFaq({ question: 'Q', answer: 'A', order: 5 });
      const call = prisma.salonFAQ.create.mock.calls[0]![0] as { data: { order: number } };
      expect(call.data.order).toBe(5);
    });
  });

  describe('updateFaq()', () => {
    it('updates faq by id', async () => {
      await service.updateFaq('faq1', { answer: 'Neue Antwort' });
      expect(prisma.salonFAQ.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'faq1' }, data: { answer: 'Neue Antwort' } }),
      );
    });
  });

  describe('deleteFaq()', () => {
    it('deletes faq by id', async () => {
      await service.deleteFaq('faq1');
      expect(prisma.salonFAQ.delete).toHaveBeenCalledWith({ where: { id: 'faq1' } });
    });
  });

  // ── Review CRUD ───────────────────────────────────────────────────────────

  describe('createReview()', () => {
    it('creates review with tenantId and defaults featured to false', async () => {
      await service.createReview({ authorName: 'Anna', rating: 5, text: 'Super!' });
      expect(prisma.salonReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: 'tenant1', featured: false }),
        }),
      );
    });

    it('sets sourceUrl to null when not provided', async () => {
      await service.createReview({ authorName: 'Anna', rating: 5, text: 'Super!' });
      const call = prisma.salonReview.create.mock.calls[0]![0] as { data: { sourceUrl: null } };
      expect(call.data.sourceUrl).toBeNull();
    });
  });

  describe('deleteReview()', () => {
    it('deletes review by id', async () => {
      await service.deleteReview('rev1');
      expect(prisma.salonReview.delete).toHaveBeenCalledWith({ where: { id: 'rev1' } });
    });
  });

  // ── Gallery CRUD ──────────────────────────────────────────────────────────

  describe('createGalleryImage()', () => {
    it('creates image with tenantId, null caption, default order 0', async () => {
      await service.createGalleryImage({ imageUrl: 'https://cdn.test/img.jpg' });
      expect(prisma.salonGalleryImage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: 'tenant1', caption: null, order: 0 }),
        }),
      );
    });
  });

  describe('deleteGalleryImage()', () => {
    it('deletes image by id', async () => {
      await service.deleteGalleryImage('img1');
      expect(prisma.salonGalleryImage.delete).toHaveBeenCalledWith({ where: { id: 'img1' } });
    });
  });
});
