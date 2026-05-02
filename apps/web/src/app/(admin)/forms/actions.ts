'use server';
import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface FormPayload {
  name: string;
  description?: string;
  fields: FormField[];
}

export async function createForm(payload: FormPayload): Promise<void> {
  const ctx = await getCurrentTenant();
  await apiFetch('/v1/forms', {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: payload,
  });
  revalidatePath('/forms');
}

export async function updateForm(
  id: string,
  payload: Partial<FormPayload> & { active?: boolean },
): Promise<void> {
  const ctx = await getCurrentTenant();
  await apiFetch(`/v1/forms/${id}`, {
    method: 'PATCH',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: payload,
  });
  revalidatePath('/forms');
  revalidatePath(`/forms/${id}`);
}

export async function deleteForm(id: string): Promise<void> {
  const ctx = await getCurrentTenant();
  await apiFetch(`/v1/forms/${id}`, {
    method: 'DELETE',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath('/forms');
}

export async function toggleFormActive(id: string, active: boolean): Promise<void> {
  const ctx = await getCurrentTenant();
  await apiFetch(`/v1/forms/${id}`, {
    method: 'PATCH',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: { active },
  });
  revalidatePath('/forms');
  revalidatePath(`/forms/${id}`);
}
