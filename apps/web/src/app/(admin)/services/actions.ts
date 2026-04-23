'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

export async function createService(form: FormData): Promise<void> {
  const ctx = getCurrentTenant();
  const name = form.get('name')?.toString().trim();
  const categoryId = form.get('categoryId')?.toString();
  const durationMinutes = Number(form.get('durationMinutes'));
  const basePrice = Number(form.get('basePrice'));
  const description = form.get('description')?.toString().trim() || undefined;

  if (!name || !categoryId) throw new Error('Name und Kategorie sind Pflicht.');
  if (!Number.isFinite(durationMinutes) || durationMinutes < 5) {
    throw new Error('Dauer muss mindestens 5 Minuten sein.');
  }
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    throw new Error('Preis muss >= 0 sein.');
  }

  try {
    await apiFetch('/v1/services', {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: {
        categoryId,
        name,
        slug: slugify(name),
        description,
        durationMinutes,
        basePrice,
        bookable: form.get('bookable') === 'on',
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.problem?.title ?? err.message);
    }
    throw err;
  }

  revalidatePath('/services');
  redirect('/services');
}

export async function createCategory(form: FormData): Promise<void> {
  const ctx = getCurrentTenant();
  const name = form.get('name')?.toString().trim();
  if (!name) throw new Error('Kategorie-Name fehlt.');

  await apiFetch('/v1/service-categories', {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: { name, order: 0 },
  });

  revalidatePath('/services');
  redirect('/services/new');
}

export async function deleteService(id: string): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/services/${id}`, {
    method: 'DELETE',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath('/services');
}

export async function updateService(id: string, form: FormData): Promise<void> {
  const ctx = getCurrentTenant();
  const name = form.get('name')?.toString().trim();
  const durationMinutes = Number(form.get('durationMinutes'));
  const basePrice = Number(form.get('basePrice'));
  const description = form.get('description')?.toString().trim() || undefined;
  const bookable = form.get('bookable') === 'on';
  const processingTimeMin = Number(form.get('processingTimeMin') ?? 0) || 0;
  const activeTimeBefore = Number(form.get('activeTimeBefore') ?? 0) || 0;
  const activeTimeAfter = Number(form.get('activeTimeAfter') ?? 0) || 0;

  if (!name) throw new Error('Name fehlt.');

  try {
    await apiFetch(`/v1/services/${id}`, {
      method: 'PATCH',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: {
        name,
        description,
        durationMinutes,
        basePrice,
        bookable,
        processingTimeMin,
        activeTimeBefore,
        activeTimeAfter,
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.problem?.title ?? err.message);
    }
    throw err;
  }

  revalidatePath('/services');
  revalidatePath(`/services/${id}`);
}

// ─── Option-Groups + Options ──────────────────────────────────

export async function createOptionGroup(
  serviceId: string,
  input: { name: string; required: boolean; multi: boolean; sortOrder: number },
): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/services/${serviceId}/option-groups`, {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: input,
  });
  revalidatePath(`/services/${serviceId}`);
}

export async function updateOptionGroup(
  serviceId: string,
  groupId: string,
  input: { name?: string; required?: boolean; multi?: boolean; sortOrder?: number },
): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/option-groups/${groupId}`, {
    method: 'PATCH',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: input,
  });
  revalidatePath(`/services/${serviceId}`);
}

export async function deleteOptionGroup(serviceId: string, groupId: string): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/option-groups/${groupId}`, {
    method: 'DELETE',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath(`/services/${serviceId}`);
}

export async function createOption(
  serviceId: string,
  input: {
    groupId: string;
    label: string;
    priceDelta: number;
    durationDeltaMin: number;
    processingDeltaMin: number;
    isDefault: boolean;
    sortOrder: number;
  },
): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch('/v1/service-options', {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: input,
  });
  revalidatePath(`/services/${serviceId}`);
}

export async function updateOption(
  serviceId: string,
  optionId: string,
  input: {
    label?: string;
    priceDelta?: number;
    durationDeltaMin?: number;
    processingDeltaMin?: number;
    isDefault?: boolean;
    sortOrder?: number;
  },
): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/service-options/${optionId}`, {
    method: 'PATCH',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: input,
  });
  revalidatePath(`/services/${serviceId}`);
}

export async function deleteOption(serviceId: string, optionId: string): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/service-options/${optionId}`, {
    method: 'DELETE',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath(`/services/${serviceId}`);
}

// ─── Add-Ons ──────────────────────────────────────────────────

export async function createAddOn(
  serviceId: string,
  input: { name: string; priceDelta: number; durationDeltaMin: number; sortOrder: number },
): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/services/${serviceId}/add-ons`, {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: input,
  });
  revalidatePath(`/services/${serviceId}`);
}

export async function updateAddOn(
  serviceId: string,
  addOnId: string,
  input: { name?: string; priceDelta?: number; durationDeltaMin?: number; sortOrder?: number },
): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/add-ons/${addOnId}`, {
    method: 'PATCH',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: input,
  });
  revalidatePath(`/services/${serviceId}`);
}

export async function deleteAddOn(serviceId: string, addOnId: string): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/add-ons/${addOnId}`, {
    method: 'DELETE',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath(`/services/${serviceId}`);
}

// ─── Preset: Nails ────────────────────────────────────────────
// Erzeugt in einem Rutsch einen "Nägel"-Service mit 3 Options-Gruppen
// (Typ/Modus/Länge) + realistischen CH-Salon-Preisen + 4 Add-Ons.
// Preise kannst du danach im Service-Editor anpassen.

type GroupSpec = { name: string; options: Array<{ label: string; price: number; dur: number }> };

const NAILS_PRESET: {
  serviceName: string;
  basePrice: number;
  baseDuration: number;
  groups: GroupSpec[];
  addOns: Array<{ name: string; price: number; dur: number }>;
} = {
  serviceName: 'Nägel',
  basePrice: 70,
  baseDuration: 60,
  groups: [
    {
      name: 'Typ',
      options: [
        { label: 'Gel', price: 0, dur: 0 },
        { label: 'Acryl', price: 10, dur: 15 },
      ],
    },
    {
      name: 'Modus',
      options: [
        { label: 'Neu', price: 20, dur: 20 },
        { label: 'Auffüllen', price: 0, dur: 0 },
        { label: 'Ablösen', price: -10, dur: -20 },
      ],
    },
    {
      name: 'Länge',
      options: [
        { label: 'Kurz', price: 0, dur: 0 },
        { label: 'Mittel', price: 10, dur: 10 },
        { label: 'Lang', price: 20, dur: 20 },
      ],
    },
  ],
  addOns: [
    { name: 'French', price: 10, dur: 10 },
    { name: 'Nail-Art pro Nagel', price: 5, dur: 5 },
    { name: 'Paraffin-Packung', price: 15, dur: 10 },
    { name: 'Nagel-Reparatur', price: 5, dur: 5 },
  ],
};

export async function applyNailsPreset(): Promise<void> {
  const ctx = getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };

  // 1) Kategorie "Nägel" suchen oder anlegen
  const catRes = await apiFetch<{ categories: Array<{ id: string; name: string }> }>(
    '/v1/service-categories',
    auth,
  );
  let nagelCat = catRes.categories.find((c) => /n[äa]gel/i.test(c.name));
  if (!nagelCat) {
    nagelCat = await apiFetch<{ id: string; name: string }>('/v1/service-categories', {
      ...auth,
      method: 'POST',
      body: { name: 'Nägel', order: 0 },
    });
  }

  // 2) Service "Nägel" anlegen (Basis-Preis + Basis-Dauer)
  const svc = await apiFetch<{ id: string }>('/v1/services', {
    ...auth,
    method: 'POST',
    body: {
      categoryId: nagelCat.id,
      name: NAILS_PRESET.serviceName,
      slug: `naegel-${Date.now()}`,
      description: 'Basis-Modellage — Typ/Modus/Länge via Varianten.',
      durationMinutes: NAILS_PRESET.baseDuration,
      basePrice: NAILS_PRESET.basePrice,
      bookable: true,
    },
  });

  // 3) Options-Gruppen + Optionen anlegen
  for (let gi = 0; gi < NAILS_PRESET.groups.length; gi++) {
    const g = NAILS_PRESET.groups[gi]!;
    const group = await apiFetch<{ id: string }>(`/v1/services/${svc.id}/option-groups`, {
      ...auth,
      method: 'POST',
      body: { name: g.name, required: true, multi: false, sortOrder: gi },
    });
    for (let oi = 0; oi < g.options.length; oi++) {
      const o = g.options[oi]!;
      await apiFetch('/v1/service-options', {
        ...auth,
        method: 'POST',
        body: {
          groupId: group.id,
          label: o.label,
          priceDelta: o.price,
          durationDeltaMin: o.dur,
          processingDeltaMin: 0,
          isDefault: oi === 0,
          sortOrder: oi,
        },
      });
    }
  }

  // 4) Add-Ons anlegen
  for (let ai = 0; ai < NAILS_PRESET.addOns.length; ai++) {
    const a = NAILS_PRESET.addOns[ai]!;
    await apiFetch(`/v1/services/${svc.id}/add-ons`, {
      ...auth,
      method: 'POST',
      body: {
        name: a.name,
        priceDelta: a.price,
        durationDeltaMin: a.dur,
        sortOrder: ai,
      },
    });
  }

  revalidatePath('/services');
  redirect(`/services/${svc.id}`);
}
