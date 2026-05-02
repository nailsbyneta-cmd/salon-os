'use server';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export async function generatePeriod(formData: FormData): Promise<void> {
  const ctx = await getCurrentTenant();

  const fromDate = formData.get('fromDate')?.toString().trim();
  const toDate = formData.get('toDate')?.toString().trim();
  const staffId = formData.get('staffId')?.toString().trim() || null;

  if (!fromDate || !toDate) {
    throw new Error('Von-Datum und Bis-Datum sind Pflicht.');
  }
  if (fromDate > toDate) {
    throw new Error('Von-Datum muss vor oder gleich Bis-Datum liegen.');
  }

  const body: { fromDate: string; toDate: string; staffId?: string | null } = {
    fromDate,
    toDate,
  };
  if (staffId) body.staffId = staffId;

  try {
    await apiFetch('/v1/payroll/generate', {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.problem?.detail ?? err.problem?.title ?? err.message);
    }
    throw err;
  }

  revalidatePath('/staff/payroll');
}

export async function closePeriod(id: string): Promise<void> {
  const ctx = await getCurrentTenant();

  try {
    await apiFetch(`/v1/payroll/${id}/close`, {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.problem?.detail ?? err.problem?.title ?? err.message);
    }
    throw err;
  }

  revalidatePath('/staff/payroll');
}
