'use server';
import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export async function updateAppointmentNotes(appointmentId: string, form: FormData): Promise<void> {
  const ctx = getCurrentTenant();
  const notes = form.get('notes')?.toString() ?? '';
  const internalNotes = form.get('internalNotes')?.toString() ?? '';
  await apiFetch(`/v1/appointments/${appointmentId}/notes`, {
    method: 'PATCH',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: {
      notes: notes || null,
      internalNotes: internalNotes || null,
    },
  });
  revalidatePath(`/calendar/${appointmentId}`);
  revalidatePath('/calendar');
}
