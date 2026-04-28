'use server';
import { ApiError, apiFetch } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export interface ClientHit {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  totalVisits: number;
  lifetimeValue: string | number;
}

/**
 * Type-Ahead-Suche für die Kundenliste. Läuft gegen /v1/clients?q=…
 * und limitiert auf 8 Treffer (passt in Dropdown ohne Scroll).
 * Leere/zu-kurze Queries (<2 Zeichen) liefern [] — vermeidet
 * Massen-Payloads beim Öffnen.
 */
export async function searchClientsInline(query: string): Promise<ClientHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const ctx = await getCurrentTenant();
  try {
    const res = await apiFetch<{ clients: ClientHit[] }>(
      `/v1/clients?q=${encodeURIComponent(q)}&limit=8`,
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
    return res.clients;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}
