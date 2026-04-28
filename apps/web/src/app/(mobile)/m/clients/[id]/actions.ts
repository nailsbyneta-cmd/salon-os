'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface FirstLocation {
  id: string;
}

async function firstLocationId(): Promise<string> {
  const ctx = await getCurrentTenant();
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
  const ctx = await getCurrentTenant();
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

/**
 * DSGVO Art. 15 — Recht auf Auskunft.
 * Holt alle persönlichen Daten der Kundin als JSON-Dump und triggert Download
 * über die Server-Action API-Route. Returnt das Payload damit das Client-
 * Component es als Blob speichert (Server-Actions können selbst keine Files
 * an den Browser streamen ohne Workaround).
 */
export async function exportClientPersonalData(clientId: string): Promise<{
  filename: string;
  content: string;
}> {
  const ctx = await getCurrentTenant();
  const data = await apiFetch<unknown>(`/v1/clients/${clientId}/export`, {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    filename: `dsgvo-export-${clientId}-${stamp}.json`,
    content: JSON.stringify(data, null, 2),
  };
}

/**
 * DSGVO Art. 17 — Recht auf Löschung.
 * Markiert die Kundin als zu löschen, schreibt Audit-Log. Backend macht aktuell
 * Soft-Delete mit Notiz; richtige Anonymisierung kommt mit dem 30-Tage-Cron.
 *
 * Nach erfolgreicher Löschung: Redirect auf Client-Liste, kein Sinn auf der
 * Detail-Seite zu bleiben.
 */
export async function requestClientDeletion(clientId: string, reason: string): Promise<void> {
  const ctx = await getCurrentTenant();
  await apiFetch(`/v1/clients/${clientId}/forget`, {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: { reason: reason || undefined },
  });
  revalidatePath('/m/clients');
  revalidatePath('/clients');
  redirect('/m/clients');
}
