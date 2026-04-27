import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from '../../src/payments/payments.service.js';

/**
 * PaymentsService persistiert (noch) nichts in der DB — der Service ist
 * eine Stripe-Adapter-Schicht. Daher kein Testcontainers-Setup nötig.
 * Block-A-Behavior-Slot: Tests verifizieren Dry-Run-Modus, Real-Mode-
 * Session-Args, Webhook-Signaturprüfung.
 */
describe('PaymentsService (behavior)', () => {
  const ORIG_ENV = { ...process.env };

  beforeAll(() => {
    delete process.env['STRIPE_SECRET_KEY'];
    delete process.env['STRIPE_WEBHOOK_SECRET'];
  });

  afterAll(() => {
    process.env = { ...ORIG_ENV };
  });

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  describe('dry-run mode (no STRIPE_SECRET_KEY)', () => {
    it('isConfigured() returns false', () => {
      const svc = new PaymentsService();
      expect(svc.isConfigured()).toBe(false);
    });

    it('createDepositCheckout returns dry-run URL with sessionId', async () => {
      const svc = new PaymentsService();
      const result = await svc.createDepositCheckout({
        appointmentId: 'appt-1',
        amount: 25,
        currency: 'CHF',
        description: 'Deposit',
        successUrl: 'https://x.test/ok',
        cancelUrl: 'https://x.test/no',
      });
      expect(result.sessionId).toMatch(/^cs_dryrun_/);
      expect(result.url).toContain('dryrun=1');
      expect(result.url).toContain('https://x.test/ok');
    });

    it('constructEvent throws NotFoundException without webhookSecret', () => {
      const svc = new PaymentsService();
      expect(() => svc.constructEvent('payload', 'sig_x')).toThrow(NotFoundException);
    });
  });

  describe('configured mode', () => {
    it('isConfigured() returns true when STRIPE_SECRET_KEY set', () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_dummy_123');
      const svc = new PaymentsService();
      expect(svc.isConfigured()).toBe(true);
    });

    it('createDepositCheckout calls Stripe and returns session URL', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_dummy_123');
      const svc = new PaymentsService();
      const stripeAccess = svc as unknown as {
        stripe: {
          checkout: {
            sessions: { create: (...args: unknown[]) => Promise<{ id: string; url: string }> };
          };
        };
      };
      const stripeMock = vi
        .spyOn(stripeAccess.stripe.checkout.sessions, 'create')
        .mockResolvedValue({
          id: 'cs_real_123',
          url: 'https://checkout.stripe.com/cs_real_123',
        });

      const result = await svc.createDepositCheckout({
        appointmentId: 'appt-x',
        amount: 50,
        currency: 'EUR',
        description: 'Deposit',
        successUrl: 'https://x.test/ok',
        cancelUrl: 'https://x.test/no',
        customerEmail: 'a@b.ch',
      });

      expect(result.sessionId).toBe('cs_real_123');
      expect(result.url).toContain('checkout.stripe.com');
      expect(stripeMock).toHaveBeenCalledOnce();
      const call = stripeMock.mock.calls[0]![0] as {
        line_items: Array<{ price_data: { unit_amount: number; currency: string } }>;
        client_reference_id: string;
        customer_email: string;
      };
      expect(call.line_items[0]!.price_data.unit_amount).toBe(5000); // 50 * 100
      expect(call.line_items[0]!.price_data.currency).toBe('eur');
      expect(call.client_reference_id).toBe('appt-x');
      expect(call.customer_email).toBe('a@b.ch');
    });

    it('constructEvent forwards to Stripe.webhooks.constructEvent', () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_dummy_123');
      vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_x');
      const svc = new PaymentsService();
      const stripeAccess = svc as unknown as {
        stripe: { webhooks: { constructEvent: (p: unknown, s: unknown, w: unknown) => unknown } };
      };
      const verifyMock = vi
        .spyOn(stripeAccess.stripe.webhooks, 'constructEvent')
        .mockReturnValue({ id: 'evt_1', type: 'checkout.session.completed' });
      const result = svc.constructEvent('raw-payload', 'sig_abc') as { id: string; type: string };
      expect(result.id).toBe('evt_1');
      expect(verifyMock).toHaveBeenCalledWith('raw-payload', 'sig_abc', 'whsec_x');
    });

    it('constructEvent throws NotFoundException when signature missing', () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_dummy_123');
      vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_x');
      const svc = new PaymentsService();
      expect(() => svc.constructEvent('payload', undefined)).toThrow(NotFoundException);
    });
  });
});
