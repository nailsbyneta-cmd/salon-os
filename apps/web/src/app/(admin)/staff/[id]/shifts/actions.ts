'use server';
import { revalidatePath } from 'next/cache';
import { toLocalIso } from '@salon-os/utils';
import { apiFetch } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface Location {
  id: string;
}

async function firstLocation(): Promise<string> {
  const ctx = getCurrentTenant();
  const res = await apiFetch<{ locations: Location[] }>('/v1/locations', {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  if (!res.locations[0]) throw new Error('Keine Location konfiguriert.');
  return res.locations[0].id;
}

export async function createShift(staffId: string, form: FormData): Promise<void> {
  const ctx = getCurrentTenant();
  const date = form.get('date')?.toString();
  const startTime = form.get('startTime')?.toString();
  const endTime = form.get('endTime')?.toString();

  if (!date || !startTime || !endTime) {
    throw new Error('Datum und Zeiten sind Pflicht.');
  }

  const locationId = await firstLocation();
  const startAt = toLocalIso(date, startTime, 'Europe/Zurich');
  const endAt = toLocalIso(date, endTime, 'Europe/Zurich');

  await apiFetch('/v1/shifts', {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: {
      staffId,
      locationId,
      startAt,
      endAt,
      isOpen: false,
    },
  });

  revalidatePath(`/staff/${staffId}/shifts`);
}

export async function deleteShift(staffId: string, shiftId: string): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/shifts/${shiftId}`, {
    method: 'DELETE',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath(`/staff/${staffId}/shifts`);
}

export async function saveWeeklySchedule(
  staffId: string,
  schedule: Record<string, Array<{ open: string; close: string }>>,
): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/staff/${staffId}/weekly-schedule`, {
    method: 'PATCH',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: schedule,
  });
  revalidatePath(`/staff/${staffId}/shifts`);
}

export async function generateShifts(staffId: string, days: number): Promise<void> {
  const ctx = getCurrentTenant();
  const locationId = await firstLocation();
  await apiFetch<{ created: number; skipped: number }>('/v1/shifts/generate-from-location', {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: { staffId, locationId, days },
  });
  revalidatePath(`/staff/${staffId}/shifts`);
}
