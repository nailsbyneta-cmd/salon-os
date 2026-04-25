'use server';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

export interface SlotStop {
  startAt: string;
  endAt: string;
  staffId: string;
  staffDisplayName: string;
  priceMinor: number;
  currency: string;
}

export interface MultiSlotsResult {
  options: Array<{
    score: number;
    gapMinutes: number;
    sameStaff: boolean;
    stops: SlotStop[];
  }>;
}

/**
 * Server-Action für Cart-Multi-Slots-Suche. Proxy für CORS-Sauberkeit
 * + um den API-URL nicht ans Frontend zu leaken.
 */
export async function searchMultiSlots(
  slug: string,
  body: {
    date: string;
    locationId: string;
    items: Array<{ serviceId: string; durationMinutes?: number }>;
  },
): Promise<MultiSlotsResult | { error: string }> {
  try {
    const res = await fetch(`${API_URL}/v1/public/${slug}/multi-slots`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { title?: string };
      return { error: err.title ?? 'Suche fehlgeschlagen' };
    }
    return (await res.json()) as MultiSlotsResult;
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Netzwerk-Fehler' };
  }
}

export interface BulkBookingInput {
  locationId: string;
  stops: Array<{ serviceId: string; staffId: string; startAt: string }>;
  client: { firstName: string; lastName: string; email: string; phone?: string };
  notes?: string;
}

export async function createBulkBooking(
  slug: string,
  input: BulkBookingInput,
): Promise<{ ok: true; appointmentIds: string[] } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_URL}/v1/public/${slug}/bookings/bulk`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': crypto.randomUUID(),
      },
      body: JSON.stringify(input),
      cache: 'no-store',
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { title?: string; detail?: string };
      return { ok: false, error: err.detail ?? err.title ?? 'Buchung fehlgeschlagen' };
    }
    const data = (await res.json()) as { appointments: Array<{ id: string }> };
    return { ok: true, appointmentIds: data.appointments.map((a) => a.id) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Netzwerk-Fehler' };
  }
}
