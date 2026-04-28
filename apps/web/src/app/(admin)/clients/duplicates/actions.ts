'use server';
import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export async function mergeClients(primaryId: string, duplicateId: string): Promise<void> {
  const ctx = await getCurrentTenant();
  try {
    await apiFetch(`/v1/clients/${primaryId}/merge`, {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: { duplicateId },
    });
    revalidatePath('/clients');
    revalidatePath('/clients/duplicates');
    revalidatePath(`/clients/${primaryId}`);
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.problem?.title ?? err.message);
    }
    throw err;
  }
}
