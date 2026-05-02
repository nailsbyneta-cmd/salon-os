import * as React from 'react';
import Link from 'next/link';
import { Badge, Button, Card, CardBody, EmptyState } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface FormRow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  _count: { submissions: number };
}

async function load(): Promise<FormRow[]> {
  const ctx = await getCurrentTenant();
  try {
    const res = await apiFetch<FormRow[]>('/v1/forms', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return res;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

export default async function FormsPage(): Promise<React.JSX.Element> {
  const forms = await load();

  return (
    <div className="w-full p-4 md:p-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
            Formulare
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Beratungs-Formulare
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Vorab-Anamnese, Einverständnis-Erklärungen, Allergie-Checks — digital, vor dem Termin.
          </p>
        </div>
        <Link href="/forms/new">
          <Button variant="accent">+ Neues Formular</Button>
        </Link>
      </header>

      {forms.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Noch keine Formulare"
          description="Erstelle dein erstes Formular — z.B. eine Anamnese oder Einverständniserklärung."
          action={
            <Link href="/forms/new">
              <Button variant="accent">Erstes Formular erstellen</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {forms.map((f) => (
            <Card key={f.id} elevation="flat" className="transition-shadow hover:shadow-md">
              <CardBody>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/forms/${f.id}`}
                        className="font-semibold text-text-primary hover:text-accent"
                      >
                        {f.name}
                      </Link>
                      <Badge tone={f.active ? 'success' : 'neutral'}>
                        {f.active ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </div>
                    {f.description ? (
                      <p className="mt-0.5 text-sm text-text-secondary">{f.description}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-display text-lg font-semibold tabular-nums text-text-primary">
                        {f._count.submissions}
                      </p>
                      <p className="text-[10px] text-text-muted">Einreichungen</p>
                    </div>
                    <Link href={`/forms/${f.id}/submissions`}>
                      <Button variant="ghost" size="sm">
                        Antworten →
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
