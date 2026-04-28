'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

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
