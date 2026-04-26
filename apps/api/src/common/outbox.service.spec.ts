import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@salon-os/db';
import { OutboxService } from './outbox.service.js';

describe('OutboxService', () => {
  let outboxService: OutboxService;
  let mockPrisma: Partial<PrismaClient>;
  let mockWithTenant: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock für outboxEvent.create
    mockPrisma = {
      outboxEvent: {
        create: vi.fn().mockResolvedValue({
          id: 'event-123',
          tenantId: 'tenant-1',
          type: 'reminder.confirmation',
          payload: { appointmentId: 'appt-1' },
          status: 'PENDING',
          attempts: 0,
          lastError: null,
          processedAt: null,
          createdAt: new Date(),
        }),
      } as any,
    };

    mockWithTenant = vi.fn();
    outboxService = new OutboxService(mockWithTenant as any);
  });

  describe('writeWithinTx', () => {
    it('should create an outbox event with correct payload', async () => {
      const tx = mockPrisma as PrismaClient;
      const payload = { appointmentId: 'appt-1', tenantId: 'tenant-1' };

      await outboxService.writeWithinTx(tx, 'reminder.confirmation', payload);

      expect(mockPrisma.outboxEvent?.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          type: 'reminder.confirmation',
          payload: expect.objectContaining({ appointmentId: 'appt-1' }),
        },
      });
    });

    it('should include startAt in payload when provided', async () => {
      const tx = mockPrisma as PrismaClient;
      const payload = {
        appointmentId: 'appt-1',
        tenantId: 'tenant-1',
        startAt: '2026-04-25T14:30:00Z',
      };

      await outboxService.writeWithinTx(tx, 'reminder.24h', payload);

      expect(mockPrisma.outboxEvent?.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'reminder.24h',
          payload: expect.objectContaining({
            startAt: '2026-04-25T14:30:00Z',
          }),
        }),
      });
    });

    it('should handle reminder.cancel events', async () => {
      const tx = mockPrisma as PrismaClient;
      const payload = { appointmentId: 'appt-1', tenantId: 'tenant-1' };

      await outboxService.writeWithinTx(tx, 'reminder.cancel', payload);

      expect(mockPrisma.outboxEvent?.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          type: 'reminder.cancel',
          payload: expect.objectContaining(payload),
        },
      });
    });

    it('should handle marketing events', async () => {
      const tx = mockPrisma as PrismaClient;
      const payload = { clientId: 'client-1', tenantId: 'tenant-1' };

      await outboxService.writeWithinTx(tx, 'marketing.rebook', payload);

      expect(mockPrisma.outboxEvent?.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          type: 'marketing.rebook',
          payload: expect.objectContaining(payload),
        },
      });
    });
  });
});
