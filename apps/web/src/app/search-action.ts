'use server';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export interface SearchHit {
  id: string;
  kind: 'client' | 'service' | 'staff';
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

  const [clientsRes, servicesRes, staffRes] = await Promise.all([
    fetchClients,
    fetchServices,
    fetchStaff,
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

  return [...clients, ...services, ...staff];
}
