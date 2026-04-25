'use server';
import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface FirstLocation {
  id: string;
}

async function firstLocationId(): Promise<string> {
  const ctx = getCurrentTenant();
  const res = await apiFetch<{ locations: FirstLocation[] }>('/v1/locations', {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  if (!res.locations[0]) throw new Error('Keine Location konfiguriert');
  return res.locations[0].id;
}

/**
 * Erstellt eine AppointmentSeries aus einem AI-erkannten Pattern.
 * Eingabe minimal — das Backend kennt durations/preise via serviceId.
 */
export async function acceptSuggestedPattern(
  clientId: string,
  pattern: {
    serviceId: string;
    staffId: string;
    intervalWeeks: number;
    durationMinutes: number;
    nextSuggestedAt: string;
  },
): Promise<void> {
  const ctx = getCurrentTenant();
  const locationId = await firstLocationId();

  await apiFetch('/v1/appointment-series', {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: {
      clientId,
      staffId: pattern.staffId,
      serviceId: pattern.serviceId,
      locationId,
      intervalWeeks: pattern.intervalWeeks,
      firstStartAt: pattern.nextSuggestedAt,
      durationMinutes: pattern.durationMinutes,
      initialOccurrences: 3,
      notes: '🤖 AI-erkanntes Stamm-Kundinnen-Muster',
    },
  });

  revalidatePath(`/m/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}`);
}
