'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface FormShape {
  customerId: string;
  loginCustomerId: string;
  refreshToken: string;
  googleAdsId: string;
  ga4MeasurementId: string;
  bookingCompletedLabel: string;
  enabled: boolean;
}

function readForm(form: FormData): FormShape {
  return {
    customerId: String(form.get('customerId') ?? '').trim(),
    loginCustomerId: String(form.get('loginCustomerId') ?? '').trim(),
    refreshToken: String(form.get('refreshToken') ?? '').trim(),
    googleAdsId: String(form.get('googleAdsId') ?? '').trim(),
    ga4MeasurementId: String(form.get('ga4MeasurementId') ?? '').trim(),
    bookingCompletedLabel: String(form.get('bookingCompletedLabel') ?? '').trim(),
    enabled: form.get('enabled') === 'on',
  };
}

export async function saveAdsIntegration(form: FormData): Promise<void> {
  const ctx = await getCurrentTenant();
  const f = readForm(form);

  if (!f.customerId) throw new Error('Customer-ID ist Pflicht.');

  const conversionActions: Record<string, unknown> = {
    _meta: {
      googleAdsId: f.googleAdsId || null,
      ga4MeasurementId: f.ga4MeasurementId || null,
    },
  };
  if (f.bookingCompletedLabel) {
    conversionActions['booking_completed'] = f.bookingCompletedLabel;
  }

  const body: Record<string, unknown> = {
    customerId: f.customerId,
    loginCustomerId: f.loginCustomerId || null,
    enabled: f.enabled,
    conversionActions,
  };
  if (f.refreshToken) body['refreshToken'] = f.refreshToken;

  try {
    await apiFetch('/v1/ads/settings', {
      method: 'PUT',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body,
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.problem?.title ?? err.message);
    throw err;
  }
  revalidatePath('/settings/ads-integration');
  redirect('/settings/ads-integration?saved=1');
}

export async function deleteAdsIntegration(): Promise<void> {
  const ctx = await getCurrentTenant();
  await apiFetch('/v1/ads/settings', {
    method: 'DELETE',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath('/settings/ads-integration');
  redirect('/settings/ads-integration?deleted=1');
}
