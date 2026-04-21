'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
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

export async function createStaff(form: FormData): Promise<void> {
  const ctx = getCurrentTenant();
  const firstName = form.get('firstName')?.toString().trim();
  const lastName = form.get('lastName')?.toString().trim();
  const email = form.get('email')?.toString().trim();
  const role = form.get('role')?.toString() ?? 'STYLIST';
  const employmentType = form.get('employmentType')?.toString() ?? 'EMPLOYEE';
  const color = form.get('color')?.toString() || undefined;
  const phone = form.get('phone')?.toString().trim() || undefined;

  if (!firstName || !lastName || !email) {
    throw new Error('Vorname, Nachname und E-Mail sind Pflicht.');
  }

  const locationId = await firstLocation();

  try {
    await apiFetch('/v1/staff', {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: {
        firstName,
        lastName,
        email,
        phone,
        role,
        employmentType,
        color,
        locationIds: [locationId],
        serviceIds: [],
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.problem?.detail ?? err.problem?.title ?? err.message);
    }
    throw err;
  }

  revalidatePath('/staff');
  redirect('/staff');
}

export async function updateStaff(id: string, form: FormData): Promise<void> {
  const ctx = getCurrentTenant();
  const firstName = form.get('firstName')?.toString().trim();
  const lastName = form.get('lastName')?.toString().trim();
  const email = form.get('email')?.toString().trim();
  if (!firstName || !lastName || !email) {
    throw new Error('Vorname, Nachname und E-Mail sind Pflicht.');
  }

  const serviceIds = form
    .getAll('serviceIds')
    .map((v) => v.toString())
    .filter(Boolean);

  const body: Record<string, unknown> = {
    firstName,
    lastName,
    email,
    role: form.get('role')?.toString() ?? 'STYLIST',
    employmentType: form.get('employmentType')?.toString() ?? 'EMPLOYEE',
    active: form.get('active') === 'on',
    serviceIds,
  };
  // Nullable Felder: leerer String = Feld leeren (null), nicht skippen.
  const nullable = (k: string): void => {
    const raw = form.get(k);
    if (raw === null) return;
    const v = raw.toString().trim();
    body[k] = v === '' ? null : v;
  };
  nullable('displayName');
  nullable('phone');
  nullable('color');
  nullable('photoUrl');
  nullable('bio');

  try {
    await apiFetch(`/v1/staff/${id}`, {
      method: 'PATCH',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.problem?.detail ?? err.problem?.title ?? err.message);
    }
    throw err;
  }

  revalidatePath('/staff');
  revalidatePath(`/staff/${id}`);
  revalidatePath('/book/beautycenter-by-neta');
  redirect('/staff');
}

export async function deleteStaff(id: string): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/staff/${id}`, {
    method: 'DELETE',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath('/staff');
}
