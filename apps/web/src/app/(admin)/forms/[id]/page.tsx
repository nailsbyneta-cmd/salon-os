import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Button, Card, CardBody } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { FormBuilderClient } from '../form-builder-client';
import { deleteForm, toggleFormActive } from '../actions';

interface FormDetail {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  fields: Array<{
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date';
    required: boolean;
    options?: string[];
  }>;
  createdAt: string;
}

async function load(id: string): Promise<FormDetail | null> {
  const ctx = await getCurrentTenant();
  try {
    return await apiFetch<FormDetail>(`/v1/forms/${id}`, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

export default async function FormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const form = await load(id);
  if (!form) notFound();

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <Link href="/forms" className="text-xs text-text-muted hover:text-text-primary">
        ← Formulare
      </Link>

      <header className="mt-4 mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
              Formular
            </p>
            <Badge tone={form.active ? 'success' : 'neutral'}>
              {form.active ? 'Aktiv' : 'Inaktiv'}
            </Badge>
          </div>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            {form.name}
          </h1>
          {form.description ? (
            <p className="mt-1 text-sm text-text-secondary">{form.description}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Link href={`/forms/${id}/submissions`}>
            <Button variant="ghost" size="sm">
              Antworten ansehen
            </Button>
          </Link>
          <form action={toggleFormActive.bind(null, id, !form.active)}>
            <Button type="submit" variant="ghost" size="sm">
              {form.active ? 'Deaktivieren' : 'Aktivieren'}
            </Button>
          </form>
        </div>
      </header>

      <div className="mb-6 rounded-lg border border-accent/20 bg-accent/5 p-4">
        <p className="text-sm font-medium text-text-primary">
          Formular-Link für Kundinnen:
        </p>
        <p className="mt-1 font-mono text-xs text-text-secondary break-all">
          {`/form/${id}`}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Schicke diesen Link per E-Mail vor dem Termin — Kundin füllt es am Handy aus.
        </p>
      </div>

      <FormBuilderClient initial={form} />

      <div className="mt-8 border-t border-border pt-6">
        <h2 className="mb-3 text-sm font-semibold text-danger">Gefahrenzone</h2>
        <form action={deleteForm.bind(null, id)}>
          <Button type="submit" variant="ghost" className="border border-danger text-danger hover:bg-danger/10">
            Formular löschen
          </Button>
        </form>
      </div>
    </div>
  );
}
