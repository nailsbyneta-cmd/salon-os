'use server';
import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export async function fulfillWaitlist(id: string): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/waitlist/${id}/fulfill`, {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath('/waitlist');
}

export async function cancelWaitlist(id: string): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/waitlist/${id}/cancel`, {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath('/waitlist');
}
