'use server';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export interface SearchHit {
  id: string;
  kind: 'client' | 'service' | 'staff' | 'appointment';
  label: string;
  hint?: string;
  href: string;
}

/**
 * Server-Action für Command-Palette (⌘K). Parallele Suchen in
 * Clients + Services. Begrenzt auf 5 pro Typ für eine schnelle
 * Anzeige.
 */
export async function searchCommand(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const ctx = getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };

  const fetchClients = apiFetch<{
    clients: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
    }>;
  }>(`/v1/clients?q=${encodeURIComponent(q)}&limit=5`, auth).catch((e) => {
    if (e instanceof ApiError) return { clients: [] };
    throw e;
  });

  const fetchServices = apiFetch<{
    services: Array<{
      id: string;
      name: string;
      durationMinutes: number;
      basePrice: string;
    }>;
  }>('/v1/services', auth).catch((e) => {
    if (e instanceof ApiError) return { services: [] };
    throw e;
  });

  const fetchStaff = apiFetch<{
    staff: Array<{
      id: string;
      firstName: string;
      lastName: string;
      displayName: string | null;
      email: string;
    }>;
  }>('/v1/staff', auth).catch((e) => {
    if (e instanceof ApiError) return { staff: [] };
    throw e;
  });

  // Upcoming Appointments suchen — Client-Name match, ab heute bis +14 Tage.
  // Server-seitiger q-Filter + limit=10 damit Payload konstant klein bleibt.
  const now = new Date();
  const fromIso = now.toISOString();
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 14);
  const toIso = toDate.toISOString();
  const apptQs = new URLSearchParams({
    from: fromIso,
    to: toIso,
    q,
    limit: '10',
  });
  const fetchAppts = apiFetch<{
    appointments: Array<{
      id: string;
      startAt: string;
      status: string;
      client: { firstName: string; lastName: string } | null;
      staff: { firstName: string; lastName: string } | null;
      items: Array<{ service: { name: string } }>;
    }>;
  }>(`/v1/appointments?${apptQs.toString()}`, auth).catch((e) => {
    if (e instanceof ApiError) return { appointments: [] };
    throw e;
  });

  const [clientsRes, servicesRes, staffRes, apptsRes] = await Promise.all([
    fetchClients,
    fetchServices,
    fetchStaff,
    fetchAppts,
  ]);

  const clients: SearchHit[] = clientsRes.clients.map((c) => ({
    id: `client:${c.id}`,
    kind: 'client',
    label: `${c.firstName} ${c.lastName}`,
    hint: c.email ?? '',
    href: `/clients/${c.id}`,
  }));

  const needle = q.toLowerCase();
  const services: SearchHit[] = servicesRes.services
    .filter((s) => s.name.toLowerCase().includes(needle))
    .slice(0, 5)
    .map((s) => ({
      id: `service:${s.id}`,
      kind: 'service',
      label: s.name,
      hint: `${s.durationMinutes} Min · ${Number(s.basePrice).toFixed(2)} CHF`,
      href: `/services`,
    }));

  const staff: SearchHit[] = staffRes.staff
    .filter((s) => {
      const full = `${s.firstName} ${s.lastName} ${s.displayName ?? ''}`
        .toLowerCase();
      return full.includes(needle);
    })
    .slice(0, 5)
    .map((s) => ({
      id: `staff:${s.id}`,
      kind: 'staff' as const,
      label: s.displayName ?? `${s.firstName} ${s.lastName}`,
      hint: s.email,
      href: `/staff/${s.id}`,
    }));

  // Appointments: API filtert bereits auf q + limit. Client-side nur noch
  // terminale Status rauskicken + null-client skip.
  const appointments: SearchHit[] = apptsRes.appointments
    .filter(
      (a) =>
        a.status !== 'CANCELLED' &&
        a.status !== 'NO_SHOW' &&
        a.client !== null,
    )
    .slice(0, 5)
    .map((a) => {
      const clientName = `${a.client!.firstName} ${a.client!.lastName}`;
      const when = new Date(a.startAt).toLocaleString('de-CH', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Zurich',
      });
      const services = a.items.map((i) => i.service.name).join(', ');
      const staffHint = a.staff?.firstName ?? '—';
      return {
        id: `appt:${a.id}`,
        kind: 'appointment' as const,
        label: `${clientName} · ${when}`,
        hint: `${services || '—'} · ${staffHint}`,
        href: `/calendar/${a.id}`,
      };
    });

  return [...clients, ...appointments, ...staff, ...services];
}
