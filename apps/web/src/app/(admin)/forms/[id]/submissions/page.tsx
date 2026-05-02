import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardBody, EmptyState } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface Submission {
  id: string;
  answers: Record<string, unknown>;
  createdAt: string;
  client: { firstName: string; lastName: string; email: string | null } | null;
  appointment: { startAt: string } | null;
}

interface FormMeta {
  id: string;
  name: string;
  fields: Array<{ id: string; label: string; type: string }>;
}

async function load(formId: string): Promise<{ form: FormMeta; submissions: Submission[] } | null> {
  const ctx = await getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };
  try {
    const [form, submissions] = await Promise.all([
      apiFetch<FormMeta>(`/v1/forms/${formId}`, auth),
      apiFetch<Submission[]>(`/v1/forms/${formId}/submissions`, auth),
    ]);
    return { form, submissions };
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

function fmtAnswer(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
  return String(value);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('de-CH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const data = await load(id);
  if (!data) notFound();

  const { form, submissions } = data;

  return (
    <div className="w-full p-4 md:p-8">
      <Link href={`/forms/${id}`} className="text-xs text-text-muted hover:text-text-primary">
        ← {form.name}
      </Link>

      <header className="mt-4 mb-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">Antworten</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          {form.name}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {submissions.length} Einreichung{submissions.length !== 1 ? 'en' : ''}
        </p>
      </header>

      {submissions.length === 0 ? (
        <EmptyState
          icon="📭"
          title="Noch keine Antworten"
          description="Sobald Kundinnen das Formular ausfüllen, erscheinen die Antworten hier."
        />
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <Card key={sub.id}>
              <CardBody>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    {sub.client ? (
                      <p className="font-semibold text-text-primary">
                        {sub.client.firstName} {sub.client.lastName}
                        {sub.client.email ? (
                          <span className="ml-2 text-sm font-normal text-text-muted">
                            {sub.client.email}
                          </span>
                        ) : null}
                      </p>
                    ) : (
                      <p className="text-sm text-text-muted">Anonym</p>
                    )}
                    {sub.appointment ? (
                      <p className="text-xs text-text-muted">
                        Termin: {fmtDate(sub.appointment.startAt)}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-xs text-text-muted">{fmtDate(sub.createdAt)}</p>
                </div>

                <dl className="space-y-2">
                  {form.fields.map((field) => (
                    <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_2fr] gap-2">
                      <dt className="text-xs font-medium text-text-muted">{field.label}</dt>
                      <dd className="text-sm text-text-primary">
                        {fmtAnswer((sub.answers as Record<string, unknown>)[field.id])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
