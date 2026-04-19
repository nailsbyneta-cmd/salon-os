/**
 * Tenant-Context via AsyncLocalStorage.
 * Jeder Request setzt ihn in der Middleware; jede DB-Operation liest ihn,
 * um `SET LOCAL app.current_tenant_id = ...` auf die Verbindung zu legen.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  tenantId: string;
  userId: string | null;
  role: string | null;
}

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenant<T>(ctx: TenantContext, fn: () => Promise<T> | T): Promise<T> | T {
  return storage.run(ctx, fn);
}

export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

export function requireTenantContext(): TenantContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error(
      'Tenant context missing — endpoint not behind TenantMiddleware, or middleware bug.',
    );
  }
  return ctx;
}
