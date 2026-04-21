'use server';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

/**
 * Verschiebt einen Termin um `deltaMinutes` (positiv = später, negativ = früher).
 * Client-side berechnet den neuen Start/End, Server validiert via
 * GiST-Exclusion-Constraint, dass kein Konflikt entsteht.
 */
export async function rescheduleAppointment(
  appointmentId: string,
  newStartIso: string,
  newEndIso: string,
  newStaffId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = getCurrentTenant();
  try {
    await apiFetch(`/v1/appointments/${appointmentId}/reschedule`, {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: {
        startAt: newStartIso,
        endAt: newEndIso,
        ...(newStaffId ? { staffId: newStaffId } : {}),
      },
    });
    revalidatePath('/calendar');
    revalidatePath(`/calendar/${appointmentId}`);
    revalidatePath('/');
    revalidatePath('/m');
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      return {
        ok: false,
        error: err.problem?.title ?? err.message ?? 'Fehler beim Umbuchen.',
      };
    }
    throw err;
  }
}
