'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export async function createProduct(form: FormData): Promise<void> {
  const ctx = getCurrentTenant();
  const name = form.get('name')?.toString().trim();
  const type = form.get('type')?.toString() ?? 'RETAIL';
  const sku = form.get('sku')?.toString().trim() || undefined;
  const brand = form.get('brand')?.toString().trim() || undefined;
  const unit = form.get('unit')?.toString().trim() || undefined;
  const stockLevel = Number(form.get('stockLevel') ?? 0);
  const reorderAt = Number(form.get('reorderAt') ?? 0);
  const costCHF = Number(form.get('costCHF') ?? 0);
  const retailCHF = Number(form.get('retailCHF') ?? 0);

  if (!name) throw new Error('Name fehlt.');

  try {
    await apiFetch('/v1/products', {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: {
        name,
        type,
        sku,
        brand,
        unit,
        stockLevel: Math.max(0, Math.floor(stockLevel)),
        reorderAt: Math.max(0, Math.floor(reorderAt)),
        costCents: Math.round(costCHF * 100),
        retailCents: Math.round(retailCHF * 100),
      },
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.problem?.title ?? err.message);
    throw err;
  }

  revalidatePath('/inventory');
  redirect('/inventory');
}

export async function adjustStock(id: string, delta: number): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/products/${id}/adjust`, {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: { delta },
  });
  revalidatePath('/inventory');
}

export async function deleteProduct(id: string): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/products/${id}`, {
    method: 'DELETE',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath('/inventory');
}
