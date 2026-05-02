'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export async function subscribeMembership(clientId: string, planId: string): Promise<void> {
  const ctx = await getCurrentTenant();
  try {
    await apiFetch('/v1/memberships/subscribe', {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: { clientId, planId },
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.problem?.title ?? err.message);
    throw err;
  }
  revalidatePath(`/clients/${clientId}`);
}

export async function cancelMembership(membershipId: string, clientId: string): Promise<void> {
  const ctx = await getCurrentTenant();
  try {
    await apiFetch(`/v1/memberships/${membershipId}/cancel`, {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: {},
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.problem?.title ?? err.message);
    throw err;
  }
  revalidatePath(`/clients/${clientId}`);
}

export async function forgetClient(clientId: string): Promise<void> {
  const ctx = await getCurrentTenant();
  await apiFetch(`/v1/clients/${clientId}/forget`, {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath('/clients');
  redirect('/clients');
}
