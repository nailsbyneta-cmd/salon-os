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

// ─── Bundles (Cross-Sell-Upsell) ──────────────────────────────

export async function createBundle(
  serviceId: string,
  input: {
    bundledServiceId: string;
    label: string;
    discountAmount?: number | null;
    discountPct?: number | null;
    active: boolean;
    sortOrder: number;
  },
): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/services/${serviceId}/bundles`, {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: input,
  });
  revalidatePath(`/services/${serviceId}`);
}

export async function updateBundle(
  serviceId: string,
  bundleId: string,
  input: {
    bundledServiceId?: string;
    label?: string;
    discountAmount?: number | null;
    discountPct?: number | null;
    active?: boolean;
    sortOrder?: number;
  },
): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/bundles/${bundleId}`, {
    method: 'PATCH',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: input,
  });
  revalidatePath(`/services/${serviceId}`);
}

export async function deleteBundle(serviceId: string, bundleId: string): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/bundles/${bundleId}`, {
    method: 'DELETE',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath(`/services/${serviceId}`);
}

// ─── Presets: Nails + Pediküre ────────────────────────────────
// Nails = 2 separate Services (Neues Set + Auffüllen), jeweils mit Gruppen
// Typ (Gel/Acryl) × Länge (Kurz/Mittel/Lang). Kein Design-Add-On weil
// Design/French bei Beautycenter by Neta immer inklusive ist.
// Pediküre = 3 flache Services (Basis / Spa / Premium), keine Varianten.

type OptionSpec = { label: string; price: number; dur: number };
type GroupSpec = { name: string; options: OptionSpec[] };

type ServiceSpec = {
  name: string;
  description: string;
  basePrice: number;
  baseDuration: number;
  groups: GroupSpec[];
};

const NAIL_GROUPS: GroupSpec[] = [
  {
    name: 'Typ',
    options: [
      { label: 'Gel', price: 0, dur: 0 },
      { label: 'Acryl', price: 10, dur: 15 },
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
];

const NAILS_PRESETS: ServiceSpec[] = [
  {
    name: 'Nails — Neues Set',
    description:
      'Komplettes Neuset — Gel oder Acryl in deiner Wunschlänge. Design immer inklusive.',
    basePrice: 80,
    baseDuration: 60,
    groups: NAIL_GROUPS,
  },
  {
    name: 'Nails — Auffüllen',
    description: 'Auffüllen bestehender Modellage. Design immer inklusive.',
    basePrice: 70,
    baseDuration: 60,
    groups: NAIL_GROUPS,
  },
];

const PEDICURE_PRESETS: ServiceSpec[] = [
  {
    name: 'Pediküre — Basis',
    description: 'Quick & Clean — Nagelpflege, Feilen, Lackieren. Alles inklusive.',
    basePrice: 39,
    baseDuration: 30,
    groups: [],
  },
  {
    name: 'Pediküre — Spa',
    description: 'Spa-Variante mit Wasserbad, Hornhaut-Behandlung, Massage. Alles inklusive.',
    basePrice: 49,
    baseDuration: 60,
    groups: [],
  },
  {
    name: 'Pediküre — Premium',
    description:
      'Premium inkl. Paraffinbad, Massage, komplette Verwöhn-Behandlung. Alles inklusive.',
    basePrice: 75,
    baseDuration: 60,
    groups: [],
  },
];

async function createServiceWithSpec(categoryId: string, spec: ServiceSpec): Promise<string> {
  const ctx = getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };

  const svc = await apiFetch<{ id: string }>('/v1/services', {
    ...auth,
    method: 'POST',
    body: {
      categoryId,
      name: spec.name,
      slug: `${slugify(spec.name)}-${Date.now()}`,
      description: spec.description,
      durationMinutes: spec.baseDuration,
      basePrice: spec.basePrice,
      bookable: true,
    },
  });

  for (let gi = 0; gi < spec.groups.length; gi++) {
    const g = spec.groups[gi]!;
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

  return svc.id;
}

async function getOrCreateCategory(name: string): Promise<string> {
  const ctx = getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };
  const catRes = await apiFetch<{ categories: Array<{ id: string; name: string }> }>(
    '/v1/service-categories',
    auth,
  );
  const wanted = name.toLowerCase();
  const existing = catRes.categories.find((c) => c.name.toLowerCase() === wanted);
  if (existing) return existing.id;
  const created = await apiFetch<{ id: string }>('/v1/service-categories', {
    ...auth,
    method: 'POST',
    body: { name, order: 0 },
  });
  return created.id;
}

export async function applyNailsPreset(): Promise<void> {
  const catId = await getOrCreateCategory('Nägel');
  for (const spec of NAILS_PRESETS) {
    await createServiceWithSpec(catId, spec);
  }
  revalidatePath('/services');
  redirect('/services');
}

export async function applyPedicurePreset(): Promise<void> {
  const catId = await getOrCreateCategory('Pediküre');
  for (const spec of PEDICURE_PRESETS) {
    await createServiceWithSpec(catId, spec);
  }
  revalidatePath('/services');
  redirect('/services');
}
