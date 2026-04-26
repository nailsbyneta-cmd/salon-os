import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@salon-os/db';
import { AppointmentsService } from './appointments.service.js';
import { RemindersService } from '../reminders/reminders.service.js';
import { AuditService } from '../audit/audit.service.js';

describe('AppointmentsService — Outbox Integration', () => {
  let appointmentsService: AppointmentsService;
  let mockReminders: Partial<RemindersService>;
  let mockAudit: Partial<AuditService>;
  let mockWithTenant: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReminders = {
      enqueueConfirmationViaOutbox: vi.fn().mockResolvedValue(undefined),
      enqueueReminderViaOutbox: vi.fn().mockResolvedValue(undefined),
    };

    mockAudit = {
      withinTx: vi.fn().mockResolvedValue(undefined),
    };

    mockWithTenant = vi.fn(async (tenantId, userId, role, fn) => {
      // Mock TX that tracks outbox calls
      const mockTx = {
        appointment: {
          create: vi.fn().mockResolvedValue({
            id: 'appt-123',
            tenantId: 'tenant-1',
            startAt: new Date('2026-05-01T14:00:00Z'),
            staffId: 'staff-1',
            clientId: 'client-1',
            items: [],
          }),
        },
      } as any;
      return fn(mockTx);
    });

    appointmentsService = new AppointmentsService(
      mockWithTenant as any,
      mockReminders as RemindersService,
      mockAudit as AuditService,
    );
  });

  it('should enqueue confirmation and reminder events via outbox during create', async () => {
    const input = {
      locationId: 'loc-1',
      staffId: 'staff-1',
      clientId: 'client-1',
      startAt: '2026-05-01T14:00:00Z',
      endAt: '2026-05-01T15:00:00Z',
      bookedVia: 'SELF_SERVICE' as const,
      items: [
        {
          serviceId: 'svc-1',
          staffId: 'staff-1',
          price: 100,
          duration: 60,
          taxClass: 'VAT_DEFAULT' as const,
        },
      ],
    };

    // Mock tenant context
    vi.stubGlobal('requireTenantContext', () => ({
      tenantId: 'tenant-1',
      userId: 'user-1',
      role: 'admin',
    }));

    await appointmentsService.create(input);

    // Verify that both outbox methods were called within the transaction
    expect(mockReminders.enqueueConfirmationViaOutbox).toHaveBeenCalled();
    expect(mockReminders.enqueueReminderViaOutbox).toHaveBeenCalled();

    // Verify the payload structure
    const confirmCall = (mockReminders.enqueueConfirmationViaOutbox as any).mock.calls[0];
    expect(confirmCall[1]).toMatchObject({
      appointmentId: 'appt-123',
      tenantId: 'tenant-1',
    });

    const reminderCall = (mockReminders.enqueueReminderViaOutbox as any).mock.calls[0];
    expect(reminderCall[1]).toMatchObject({
      appointmentId: 'appt-123',
      tenantId: 'tenant-1',
      startAt: expect.any(Date),
    });
  });
});
