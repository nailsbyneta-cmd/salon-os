'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export async function checkoutAppointment(appointmentId: string, form: FormData): Promise<void> {
  const ctx = getCurrentTenant();
  const tipAmount = Number(form.get('tipAmount') ?? 0);
  const paymentMethod = form.get('paymentMethod')?.toString();
  if (
    paymentMethod !== 'CASH' &&
    paymentMethod !== 'CARD' &&
    paymentMethod !== 'TWINT' &&
    paymentMethod !== 'STRIPE_CHECKOUT'
  ) {
    throw new Error('Zahlungsart wählen.');
  }

  try {
    await apiFetch(`/v1/appointments/${appointmentId}/checkout`, {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: {
        tipAmount: Number.isFinite(tipAmount) && tipAmount > 0 ? tipAmount : 0,
        paymentMethod,
        completeAppointment: true,
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.problem?.detail ?? err.problem?.title ?? err.message);
    }
    throw err;
  }

  revalidatePath('/calendar');
  revalidatePath(`/calendar/${appointmentId}`);
  revalidatePath('/');
  revalidatePath('/m');
  const celebrate = tipAmount >= 20 ? 'big-tip' : 'complete';
  // Zurück aufs Termin-Detail — dort ist der Folgetermin-Card sichtbar,
  // weil Status=COMPLETED nach checkout. Vorher gingen wir auf /calendar
  // (Tagesplan), was die „Folgetermin vormerken"-Chips versteckt hat.
  redirect(`/calendar/${appointmentId}?celebrate=${celebrate}`);
}
