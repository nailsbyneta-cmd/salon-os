'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { formString } from '@/lib/form';
import { getCurrentTenant } from '@/lib/tenant';

function toIso(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const local = new Date(y, m - 1, d, hh, mm, 0, 0);
  return local.toISOString();
}

export async function createWaitlistEntry(form: FormData): Promise<void> {
  const ctx = getCurrentTenant();

  const serviceId = formString(form, 'serviceId');
  const locationId = formString(form, 'locationId');
  const preferredStaffId = formString(form, 'preferredStaffId') || undefined;
  const earliestDate = formString(form, 'earliestDate');
  const earliestTime = formString(form, 'earliestTime') || '09:00';
  const latestDate = formString(form, 'latestDate');
  const latestTime = formString(form, 'latestTime') || '18:00';
  const notes = formString(form, 'notes')?.trim() || undefined;

  if (!serviceId || !locationId || !earliestDate || !latestDate) {
    throw new Error('Service, Standort und beide Daten sind Pflicht.');
  }

  const existingClientId = formString(form, 'clientId') || undefined;
  const newFirstName = formString(form, 'newFirstName')?.trim();
  const newLastName = formString(form, 'newLastName')?.trim();
  const newEmail = formString(form, 'newEmail')?.trim() || undefined;
  const newPhone = formString(form, 'newPhone')?.trim() || undefined;

  const body: Record<string, unknown> = {
    serviceId,
    locationId,
    earliestAt: toIso(earliestDate, earliestTime),
    latestAt: toIso(latestDate, latestTime),
    ...(preferredStaffId ? { preferredStaffId } : {}),
    ...(notes ? { notes } : {}),
  };

  if (existingClientId) {
    body.clientId = existingClientId;
  } else if (newFirstName && newLastName) {
    body.newClient = {
      firstName: newFirstName,
      lastName: newLastName,
      ...(newEmail ? { email: newEmail } : {}),
      ...(newPhone ? { phone: newPhone } : {}),
    };
  } else {
    throw new Error('Wähle eine bestehende Kundin ODER fülle Vor-/Nachname aus.');
  }

  try {
    await apiFetch('/v1/waitlist', {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.problem?.title ?? err.message);
    }
    throw err;
  }
  revalidatePath('/waitlist');
  redirect('/waitlist');
}

export async function fulfillWaitlist(id: string): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/waitlist/${id}/fulfill`, {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath('/waitlist');
}

export async function cancelWaitlist(id: string): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/waitlist/${id}/cancel`, {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath('/waitlist');
}
