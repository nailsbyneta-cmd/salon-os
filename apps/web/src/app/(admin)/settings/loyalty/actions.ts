'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export async function saveLoyaltyProgram(form: FormData): Promise<void> {
  const ctx = await getCurrentTenant();
  const body = {
    name: String(form.get('name') ?? '').trim(),
    active: form.get('active') === 'on',
    earnRule: (form.get('earnRule') ?? 'per_appointment') as 'per_appointment' | 'per_chf',
    earnPerUnit: Math.max(1, Number(form.get('earnPerUnit') ?? 1)),
    redeemThreshold: Math.max(1, Number(form.get('redeemThreshold') ?? 10)),
    rewardValueChf: Number(form.get('rewardValueChf') ?? 0),
    rewardLabel: String(form.get('rewardLabel') ?? 'Gratis-Service').trim(),
  };
  if (!body.name) throw new Error('Programm-Name ist Pflicht.');
  try {
    await apiFetch('/v1/loyalty/program', {
      method: 'PUT',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body,
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.problem?.title ?? err.message);
    throw err;
  }
  revalidatePath('/settings/loyalty');
  redirect('/settings/loyalty?saved=1');
}

export async function awardStamps(clientId: string, delta: number, notes?: string): Promise<void> {
  const ctx = await getCurrentTenant();
  await apiFetch(`/v1/loyalty/clients/${clientId}/award`, {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: { delta, notes },
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function redeemReward(clientId: string): Promise<void> {
  const ctx = await getCurrentTenant();
  await apiFetch(`/v1/loyalty/clients/${clientId}/redeem`, {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: {},
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function adjustStamps(clientId: string, delta: number, notes?: string): Promise<void> {
  if (delta === 0) return;
  const ctx = await getCurrentTenant();
  await apiFetch(`/v1/loyalty/clients/${clientId}/adjust`, {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: { delta, notes },
  });
  revalidatePath(`/clients/${clientId}`);
}
