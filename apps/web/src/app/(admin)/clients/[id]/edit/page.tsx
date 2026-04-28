import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClientForm } from '@/components/client-form';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { updateClient } from '../../actions';

interface ClientDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  notesInternal: string | null;
  tags: string[];
  emailOptIn: boolean;
  smsOptIn: boolean;
}

async function load(id: string): Promise<ClientDetail | null> {
  const ctx = await getCurrentTenant();
  try {
    return await apiFetch<ClientDetail>(`/v1/clients/${id}`, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const client = await load(id);
  if (!client) notFound();
  const action = updateClient.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <Link
        href={`/clients/${id}`}
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← {client.firstName} {client.lastName}
      </Link>
      <header className="mb-6 mt-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">CRM</p>
        <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
          Kundin bearbeiten
        </h1>
      </header>
      <ClientForm
        action={action}
        mode="edit"
        cancelHref={`/clients/${id}`}
        defaults={{
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          birthday: client.birthday,
          notes: client.notesInternal,
          tags: client.tags,
          emailOptIn: client.emailOptIn,
          smsOptIn: client.smsOptIn,
        }}
      />
    </div>
  );
}
