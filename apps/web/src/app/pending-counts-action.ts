'use server';
import { toLocalIso } from '@salon-os/utils';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export interface PendingCounts {
  toConfirmToday: number;
  lowStock: number;
  waitlist: number;
}

/**
 * Server-Action für Admin-Nav-Badge. Zählt:
 *  - BOOKED-Termine heute mit noShowRisk >= 25 ("zu bestätigen")
 *  - Produkte im Low-Stock
 *  - Aktive Waitlist-Einträge
 * Fetcht minimal — nur Counts, keine Details.
 */
export async function getPendingCounts(): Promise<PendingCounts> {
  const ctx = await getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };
  // Europe/Zurich Tagesgrenzen statt UTC — sonst zeigt Badge zwischen
  // 22:00-24:00 CH bereits Folgetags-Counts (UTC ist schon neuer Tag).
  const zurichToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
  }).format(new Date());
  const fromIso = toLocalIso(zurichToday, '00:00', 'Europe/Zurich');
  const toIso = toLocalIso(zurichToday, '23:59', 'Europe/Zurich');

  const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch (err) {
      if (err instanceof ApiError) return fallback;
      throw err;
    }
  };

  const [apptsRes, lowStockRes, wlRes] = await Promise.all([
    safe(
      apiFetch<{
        appointments: Array<{
          status: string;
          client: { noShowRisk?: string | number | null } | null;
        }>;
      }>(
        `/v1/appointments?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
        auth,
      ),
      { appointments: [] },
    ),
    safe(apiFetch<{ products: unknown[] }>('/v1/products?lowStock=true', auth), { products: [] }),
    safe(apiFetch<{ entries: unknown[] }>('/v1/waitlist', auth), {
      entries: [],
    }),
  ]);

  const toConfirmToday = apptsRes.appointments.filter((a) => {
    if (a.status !== 'BOOKED') return false;
    const risk = a.client?.noShowRisk;
    const n = risk != null ? Number(risk) : NaN;
    return Number.isFinite(n) && n >= 25;
  }).length;

  return {
    toConfirmToday,
    lowStock: lowStockRes.products.length,
    waitlist: wlRes.entries.length,
  };
}
