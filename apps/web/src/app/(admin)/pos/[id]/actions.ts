'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export interface ValidatePromoResult {
  valid: boolean;
  type?: 'PERCENT' | 'FIXED';
  value?: string;
  discountChf?: number;
  reason?: string;
}

export async function applyPromoCode(
  code: string,
  orderAmountChf: number,
): Promise<ValidatePromoResult> {
  const ctx = await getCurrentTenant();
  try {
    return await apiFetch<ValidatePromoResult>('/v1/promo-codes/validate', {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: { code: code.trim().toUpperCase(), orderAmountChf },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return { valid: false, reason: err.problem?.title ?? err.message };
    }
    throw err;
  }
}

export async function issueRefund(appointmentId: string, form: FormData): Promise<void> {
  const ctx = await getCurrentTenant();
  const amount = Number(form.get('amount'));
  const paymentMethod = form.get('paymentMethod')?.toString();
  const reason = form.get('reason')?.toString() || undefined;
  const notes = form.get('notes')?.toString() || undefined;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Ungültiger Betrag.');
  }
  if (
    paymentMethod !== 'CASH' &&
    paymentMethod !== 'CARD' &&
    paymentMethod !== 'TWINT'
  ) {
    throw new Error('Zahlungsart wählen.');
  }

  try {
    await apiFetch(`/v1/appointments/${appointmentId}/refund`, {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: { amount, paymentMethod, reason, notes },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.problem?.detail ?? err.problem?.title ?? err.message);
    }
    throw err;
  }

  revalidatePath(`/pos/${appointmentId}`);
  revalidatePath(`/calendar/${appointmentId}`);
}

export async function checkoutAppointment(appointmentId: string, form: FormData): Promise<void> {
  const ctx = await getCurrentTenant();
  const tipAmount = Number(form.get('tipAmount') ?? 0);
  const paymentMethod = form.get('paymentMethod')?.toString();
  const discountCode = form.get('discountCode')?.toString().trim() || undefined;
  const discountChf = Number(form.get('discountChf') ?? 0);

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
        ...(discountCode && Number.isFinite(discountChf) && discountChf > 0
          ? { discountCode, discountChf }
          : {}),
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
