import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';

const BASE_INPUT = {
  appointmentId: 'appt1',
  amount: 25,
  currency: 'CHF',
  description: 'Anzahlung Shellac',
  successUrl: 'https://salon.ch/success',
  cancelUrl: 'https://salon.ch/cancel',
  customerEmail: 'anna@test.ch',
};

describe('PaymentsService — dry-run (no STRIPE_SECRET_KEY)', () => {
  let PaymentsService: typeof import('./payments.service.js').PaymentsService;

  beforeEach(async () => {
    delete process.env['STRIPE_SECRET_KEY'];
    delete process.env['STRIPE_WEBHOOK_SECRET'];
    vi.resetModules();
    ({ PaymentsService } = await import('./payments.service.js'));
  });

  afterEach(() => {
    delete process.env['STRIPE_SECRET_KEY'];
    delete process.env['STRIPE_WEBHOOK_SECRET'];
  });

  it('isConfigured() returns false without STRIPE_SECRET_KEY', () => {
    const svc = new PaymentsService();
    expect(svc.isConfigured()).toBe(false);
  });

  it('createDepositCheckout returns a dry-run sessionId with cs_dryrun_ prefix', async () => {
    const svc = new PaymentsService();
    const result = await svc.createDepositCheckout(BASE_INPUT);
    expect(result.sessionId).toMatch(/^cs_dryrun_/);
  });

  it('createDepositCheckout dry-run URL contains successUrl', async () => {
    const svc = new PaymentsService();
    const result = await svc.createDepositCheckout(BASE_INPUT);
    expect(result.url).toContain(BASE_INPUT.successUrl);
  });

  it('createDepositCheckout dry-run URL includes dryrun=1', async () => {
    const svc = new PaymentsService();
    const result = await svc.createDepositCheckout(BASE_INPUT);
    expect(result.url).toContain('dryrun=1');
  });

  it('constructEvent throws NotFoundException without webhook secret', () => {
    const svc = new PaymentsService();
    expect(() => svc.constructEvent('payload', 'sig')).toThrow(NotFoundException);
  });

  it('constructEvent throws NotFoundException with missing signature', () => {
    const svc = new PaymentsService();
    expect(() => svc.constructEvent('payload', undefined)).toThrow(NotFoundException);
  });
});

describe('PaymentsService — configured (with STRIPE_SECRET_KEY)', () => {
  let PaymentsService: typeof import('./payments.service.js').PaymentsService;

  beforeEach(async () => {
    process.env['STRIPE_SECRET_KEY'] = 'sk_test_fake_key_for_test';
    process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_fake';
    vi.resetModules();
    ({ PaymentsService } = await import('./payments.service.js'));
  });

  afterEach(() => {
    delete process.env['STRIPE_SECRET_KEY'];
    delete process.env['STRIPE_WEBHOOK_SECRET'];
  });

  it('isConfigured() returns true with STRIPE_SECRET_KEY', () => {
    const svc = new PaymentsService();
    expect(svc.isConfigured()).toBe(true);
  });
});
