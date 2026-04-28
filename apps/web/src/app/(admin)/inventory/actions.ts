'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export async function createProduct(form: FormData): Promise<void> {
  const ctx = await getCurrentTenant();
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

export type StockReason = 'PURCHASE' | 'SALE' | 'USAGE' | 'ADJUSTMENT' | 'RETURN' | 'INITIAL';

export async function adjustStock(
  id: string,
  delta: number,
  reason: StockReason = 'ADJUSTMENT',
  notes?: string,
): Promise<void> {
  const ctx = await getCurrentTenant();
  await apiFetch(`/v1/products/${id}/adjust`, {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: { delta, reason, notes },
  });
  revalidatePath('/inventory');
  revalidatePath(`/inventory/${id}`);
}

/** Form-action variant für FormData submits aus den Adjust-Forms. */
export async function adjustStockForm(productId: string, form: FormData): Promise<void> {
  const delta = Number(form.get('delta') ?? 0);
  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error('Anpassung muss eine ganze Zahl ungleich 0 sein.');
  }
  const reason = String(form.get('reason') ?? 'ADJUSTMENT') as StockReason;
  const notes = String(form.get('notes') ?? '').trim() || undefined;
  await adjustStock(productId, Math.round(delta), reason, notes);
  revalidatePath(`/inventory/${productId}`);
  redirect(`/inventory/${productId}?adjusted=1`);
}

export async function deleteProduct(id: string): Promise<void> {
  const ctx = await getCurrentTenant();
  await apiFetch(`/v1/products/${id}`, {
    method: 'DELETE',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath('/inventory');
}
