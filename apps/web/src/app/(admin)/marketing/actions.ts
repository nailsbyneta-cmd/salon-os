'use server';
import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export async function runReactivation(): Promise<void> {
  const ctx = await getCurrentTenant();
  await apiFetch<{ enqueued: number; skippedRecent: number }>('/v1/marketing/reactivation/run', {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath('/marketing');
}
