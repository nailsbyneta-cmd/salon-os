'use server';
import { redirect } from 'next/navigation';
import { toLocalIso } from '@salon-os/utils';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface ServiceInfo {
  id: string;
  name: string;
  durationMinutes: number;
  basePrice: string;
}

interface LocationInfo {
  id: string;
}

async function fetchService(id: string): Promise<ServiceInfo> {
  const ctx = getCurrentTenant();
  return apiFetch<ServiceInfo>(`/v1/services/${id}`, {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
}

async function fetchFirstLocation(): Promise<LocationInfo> {
  const ctx = getCurrentTenant();
  const res = await apiFetch<{ locations: LocationInfo[] }>('/v1/locations', {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  if (!res.locations[0]) throw new Error('No location configured');
  return res.locations[0];
}

async function ensureClient(form: FormData): Promise<string | null> {
  const ctx = getCurrentTenant();
  const existingId = form.get('clientId')?.toString();
  if (existingId) return existingId;

  const firstName = form.get('clientFirstName')?.toString().trim();
  const lastName = form.get('clientLastName')?.toString().trim();
  if (!firstName || !lastName) return null;

  const email = form.get('clientEmail')?.toString().trim() || undefined;
  const phone = form.get('clientPhone')?.toString().trim() || undefined;

  const created = await apiFetch<{ id: string }>('/v1/clients', {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: { firstName, lastName, email, phone },
  });
  return created.id;
}

export async function createAppointment(form: FormData): Promise<void> {
  const ctx = getCurrentTenant();

  const serviceId = form.get('serviceId')?.toString();
  const staffId = form.get('staffId')?.toString();
  const date = form.get('date')?.toString();
  const time = form.get('time')?.toString();

  if (!serviceId || !staffId || !date || !time) {
    throw new Error('Bitte Service, Mitarbeiterin, Datum und Zeit wählen.');
  }

  const [service, location] = await Promise.all([fetchService(serviceId), fetchFirstLocation()]);

  // Salon-Zeit (Europe/Zurich) mit korrektem DST-Offset.
  const startAtIso = toLocalIso(date, time, 'Europe/Zurich');
  const endDate = new Date(startAtIso);
  endDate.setMinutes(endDate.getMinutes() + service.durationMinutes);
  const endAtIso = endDate.toISOString();

  const clientId = await ensureClient(form);

  try {
    await apiFetch('/v1/appointments', {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: {
        locationId: location.id,
        clientId,
        staffId,
        startAt: startAtIso,
        endAt: endAtIso,
        bookedVia: 'STAFF_INTERNAL',
        items: [
          {
            serviceId,
            staffId,
            price: Number(service.basePrice),
            duration: service.durationMinutes,
          },
        ],
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      const msg = err.problem?.detail ?? err.problem?.title ?? err.message;
      throw new Error(`Buchung fehlgeschlagen: ${msg}`);
    }
    throw err;
  }

  redirect(`/calendar?date=${date}&celebrate=booking`);
}
