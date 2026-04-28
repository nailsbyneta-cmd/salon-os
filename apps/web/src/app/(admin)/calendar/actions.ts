'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

type Transition = 'confirm' | 'check-in' | 'start' | 'complete';

export async function transitionAppointment(appointmentId: string, to: Transition): Promise<void> {
  const ctx = await getCurrentTenant();
  await apiFetch(`/v1/appointments/${appointmentId}/${to}`, {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath('/calendar');
  revalidatePath(`/calendar/${appointmentId}`);
  revalidatePath('/');
  revalidatePath('/m');
  // Celebrate-Trigger bei „complete"
  if (to === 'complete') {
    redirect(`/calendar/${appointmentId}?celebrate=complete`);
  }
}

export async function cancelAppointment(appointmentId: string, reason: string): Promise<void> {
  const ctx = await getCurrentTenant();
  await apiFetch(`/v1/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: { reason: reason || 'Auf Kundenwunsch storniert', notifyClient: false },
  });
  revalidatePath('/calendar');
  revalidatePath(`/calendar/${appointmentId}`);
  revalidatePath('/');
  revalidatePath('/m');
}

export async function markNoShow(appointmentId: string): Promise<void> {
  const ctx = await getCurrentTenant();
  await apiFetch(`/v1/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: {
      reason: 'Nicht erschienen',
      noShow: true,
      notifyClient: false,
    },
  });
  revalidatePath('/calendar');
  revalidatePath(`/calendar/${appointmentId}`);
  revalidatePath('/clients');
  revalidatePath('/');
  revalidatePath('/m');
}
