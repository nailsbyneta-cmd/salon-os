'use client';
import * as React from 'react';
import { Avatar, Button } from '@salon-os/ui';
import { mergeClients } from './actions';

interface ClientPreview {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  lastVisitAt: string | null;
  totalVisits: number;
  lifetimeValue: string | number;
}

/**
 * Bestätigungs-Dialog vor dem Merge. Zeigt Primary + Duplikat
 * side-by-side mit allen relevanten Feldern, damit User vor dem
 * endgültigen Merge prüfen kann welche Version gewinnt + was übertragen
 * wird.
 *
 * Merge ist destruktiv (soft-delete beim Duplikat) — darum darf's keinen
 * versehentlichen Klick geben. Dialog blockt mit modal + requires
 * expliziten 'Zusammenführen'-Click.
 */
export function MergeDialog({
  primary,
  duplicate,
}: {
  primary: ClientPreview;
  duplicate: ClientPreview;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const submit = (): void => {
    setError(null);
    startTransition(async () => {
      try {
        await mergeClients(primary.id, duplicate.id);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Merge fehlgeschlagen');
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="accent"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`${duplicate.firstName} ${duplicate.lastName} in Primary mergen`}
      >
        → Mergen
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Zusammenführen bestätigen"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          <button
            type="button"
            onClick={() => (pending ? null : setOpen(false))}
            aria-label="Schliessen"
            className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
          />
          <div className="relative w-full max-w-2xl rounded-lg border border-border bg-surface shadow-xl animate-fade-in">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold text-text-primary">Kundinnen zusammenführen?</h2>
              <p className="mt-1 text-xs text-text-muted">
                Alle Termine + Wartelisten von <strong>Duplikat</strong> werden auf{' '}
                <strong>Primary (★)</strong> übertragen. Leere Felder im Primary werden vom Duplikat
                ergänzt. Das Duplikat wird gelöscht (soft-delete, im Audit-Log nachvollziehbar).
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-2">
              <ClientCompareCard label="★ Primary (bleibt)" tone="accent" client={primary} />
              <ClientCompareCard
                label="Duplikat (wird gelöscht)"
                tone="danger"
                client={duplicate}
              />
            </div>

            {error ? (
              <div className="mx-5 mb-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                variant="accent"
                onClick={submit}
                loading={pending}
                disabled={pending}
              >
                Zusammenführen
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ClientCompareCard({
  label,
  tone,
  client,
}: {
  label: string;
  tone: 'accent' | 'danger';
  client: ClientPreview;
}): React.JSX.Element {
  const ltv = Number(client.lifetimeValue) || 0;
  const last = client.lastVisitAt ? new Date(client.lastVisitAt).toLocaleDateString('de-CH') : '—';
  const borderClass = tone === 'accent' ? 'border-l-accent' : 'border-l-danger';
  return (
    <div
      className={`rounded-md border border-border border-l-4 ${borderClass} bg-background/50 p-4`}
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="flex items-center gap-3">
        <Avatar
          name={`${client.firstName} ${client.lastName}`}
          size="md"
          color="hsl(var(--brand-accent))"
        />
        <div className="min-w-0">
          <div className="truncate font-semibold text-text-primary">
            {client.firstName} {client.lastName}
          </div>
          <div className="truncate text-xs text-text-muted">ID: {client.id.slice(0, 8)}…</div>
        </div>
      </div>
      <dl className="mt-3 space-y-1 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-text-muted">E-Mail</dt>
          <dd className="truncate text-text-primary">{client.email ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-text-muted">Telefon</dt>
          <dd className="truncate text-text-primary">{client.phone ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-text-muted">Besuche</dt>
          <dd className="text-text-primary tabular-nums">{client.totalVisits}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-text-muted">Umsatz total</dt>
          <dd className="text-text-primary tabular-nums">{ltv.toFixed(2)} CHF</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-text-muted">Letzter Besuch</dt>
          <dd className="text-text-primary">{last}</dd>
        </div>
      </dl>
    </div>
  );
}
