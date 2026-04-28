'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export async function issueGiftCard(form: FormData): Promise<void> {
  const ctx = await getCurrentTenant();
  const amount = Number(form.get('amount'));
  const recipientName = form.get('recipientName')?.toString().trim() || undefined;
  const recipientEmail = form.get('recipientEmail')?.toString().trim() || undefined;
  const message = form.get('message')?.toString().trim() || undefined;
  const expiresInDays = Number(form.get('expiresInDays') ?? 365);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Gültigen Betrag eingeben.');
  }

  try {
    await apiFetch('/v1/gift-cards', {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: {
        amount,
        recipientName,
        recipientEmail,
        message,
        expiresInDays,
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.problem?.title ?? err.message);
    }
    throw err;
  }

  revalidatePath('/gift-cards');
  redirect('/gift-cards');
}
