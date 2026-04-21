import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { runWithTenant } from '../../tenant/tenant.context.js';

import { IdempotencyInterceptor } from './idempotency.interceptor.js';
import { InMemoryIdempotencyStore } from './idempotency.store.js';

type ReqStub = {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
};

type ReplyStub = { statusCode: number; status: (code: number) => ReplyStub };

function makeContext(req: ReqStub, reply: ReplyStub): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: <T>() => req as T,
      getResponse: <T>() => reply as T,
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function makeReply(): ReplyStub {
  const r: ReplyStub = {
    statusCode: 200,
    status(code) {
      r.statusCode = code;
      return r;
    },
  };
  return r;
}

const TENANT = { tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', userId: null, role: null };

describe('IdempotencyInterceptor', () => {
  it('lässt GET-Requests unverändert durch (keine Deduplizierung)', async () => {
    const store = new InMemoryIdempotencyStore();
    const spy = vi.spyOn(store, 'get');
    const interceptor = new IdempotencyInterceptor(store);
    const ctx = makeContext(
      { method: 'GET', url: '/v1/clients', headers: { 'idempotency-key': 'k1' } },
      makeReply(),
    );
    const handler: CallHandler = { handle: () => of({ clients: [] }) };

    const result = await firstValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toEqual({ clients: [] });
    expect(spy).not.toHaveBeenCalled();
  });

  it('läuft ohne Idempotency-Header als No-Op', async () => {
    const store = new InMemoryIdempotencyStore();
    const spy = vi.spyOn(store, 'set');
    const interceptor = new IdempotencyInterceptor(store);
    const ctx = makeContext(
      { method: 'POST', url: '/v1/clients', headers: {} },
      makeReply(),
    );
    const handler: CallHandler = { handle: () => of({ id: '1' }) };

    await firstValueFrom(interceptor.intercept(ctx, handler));

    expect(spy).not.toHaveBeenCalled();
  });

  it('cached beim ersten POST und liefert beim zweiten denselben Body ohne Re-Run', async () => {
    const store = new InMemoryIdempotencyStore();
    const interceptor = new IdempotencyInterceptor(store);
    const handler = { handle: vi.fn(() => of({ id: '1', created: true })) };

    await runWithTenant(TENANT, async () => {
      const first = await firstValueFrom(
        interceptor.intercept(
          makeContext(
            { method: 'POST', url: '/v1/clients', headers: { 'idempotency-key': 'dup-key' } },
            makeReply(),
          ),
          handler as CallHandler,
        ),
      );
      expect(first).toEqual({ id: '1', created: true });

      const secondReply = makeReply();
      const second = await firstValueFrom(
        interceptor.intercept(
          makeContext(
            { method: 'POST', url: '/v1/clients', headers: { 'idempotency-key': 'dup-key' } },
            secondReply,
          ),
          handler as CallHandler,
        ),
      );
      expect(second).toEqual({ id: '1', created: true });
      expect(handler.handle).toHaveBeenCalledTimes(1);
    });
  });

  it('isoliert Cache pro Tenant (selber Key, anderer Tenant → neue Ausführung)', async () => {
    const store = new InMemoryIdempotencyStore();
    const interceptor = new IdempotencyInterceptor(store);
    const handler = { handle: vi.fn(() => of({ id: 'x' })) };

    await runWithTenant(TENANT, () =>
      firstValueFrom(
        interceptor.intercept(
          makeContext(
            { method: 'POST', url: '/v1/clients', headers: { 'idempotency-key': 'k' } },
            makeReply(),
          ),
          handler as CallHandler,
        ),
      ),
    );

    const otherTenant = { ...TENANT, tenantId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' };
    await runWithTenant(otherTenant, () =>
      firstValueFrom(
        interceptor.intercept(
          makeContext(
            { method: 'POST', url: '/v1/clients', headers: { 'idempotency-key': 'k' } },
            makeReply(),
          ),
          handler as CallHandler,
        ),
      ),
    );

    expect(handler.handle).toHaveBeenCalledTimes(2);
  });

  it('weist unzulässige Idempotency-Keys mit 400 ab', async () => {
    const interceptor = new IdempotencyInterceptor(new InMemoryIdempotencyStore());
    const ctx = makeContext(
      {
        method: 'POST',
        url: '/v1/clients',
        headers: { 'idempotency-key': "drop table clients;--" },
      },
      makeReply(),
    );
    const handler: CallHandler = { handle: () => of(null) };

    expect(() => interceptor.intercept(ctx, handler)).toThrow(BadRequestException);
  });

  it('fail-open wenn kein Store injiziert wurde', async () => {
    const interceptor = new IdempotencyInterceptor(null);
    const ctx = makeContext(
      { method: 'POST', url: '/v1/clients', headers: { 'idempotency-key': 'k' } },
      makeReply(),
    );
    const handler: CallHandler = { handle: () => of({ ok: true }) };

    const res = await firstValueFrom(interceptor.intercept(ctx, handler));
    expect(res).toEqual({ ok: true });
  });
});
