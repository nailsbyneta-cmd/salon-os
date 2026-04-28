import Link from 'next/link';
import { Badge, Card, CardBody, EmptyState } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface AuditEntry {
  id: string;
  tenantId: string | null;
  actorId: string | null;
  actorType: string | null;
  entity: string;
  entityId: string;
  action: string;
  diff: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

async function loadAudit(opts: {
  entity?: string;
  action?: string;
  from?: string;
  to?: string;
  cursor?: string;
}): Promise<{ entries: AuditEntry[]; nextCursor: string | null }> {
  const ctx = await getCurrentTenant();
  const qs = new URLSearchParams();
  if (opts.entity) qs.set('entity', opts.entity);
  if (opts.action) qs.set('action', opts.action);
  if (opts.from) qs.set('from', `${opts.from}T00:00:00.000Z`);
  if (opts.to) qs.set('to', `${opts.to}T23:59:59.999Z`);
  if (opts.cursor) qs.set('cursor', opts.cursor);
  qs.set('limit', '100');
  try {
    return await apiFetch<{ entries: AuditEntry[]; nextCursor: string | null }>(
      `/v1/audit-log?${qs.toString()}`,
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
  } catch (err) {
    if (err instanceof ApiError) return { entries: [], nextCursor: null };
    throw err;
  }
}

async function loadFacets(): Promise<{ entities: string[]; actions: string[] }> {
  const ctx = await getCurrentTenant();
  try {
    return await apiFetch<{ entities: string[]; actions: string[] }>(
      '/v1/audit-log/facets',
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
  } catch (err) {
    if (err instanceof ApiError) return { entities: [], actions: [] };
    throw err;
  }
}

const entityLabel: Record<string, string> = {
  Client: 'Kundin',
  Appointment: 'Termin',
  GiftCard: 'Gutschein',
  Service: 'Service',
  Staff: 'Team',
};

const actionLabel: Record<
  string,
  { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent' }
> = {
  create: { label: 'Angelegt', tone: 'success' },
  update: { label: 'Geändert', tone: 'info' },
  reschedule: { label: 'Umgebucht', tone: 'accent' },
  cancel: { label: 'Storniert', tone: 'danger' },
  'no-show': { label: 'No-Show', tone: 'danger' },
  'soft-delete': { label: 'Gelöscht', tone: 'warning' },
  'gdpr-forget': { label: 'DSGVO-Löschung', tone: 'danger' },
};

function entityHref(entity: string, id: string): string | null {
  if (entity === 'Client') return `/clients/${id}`;
  if (entity === 'Appointment') return `/calendar/${id}`;
  if (entity === 'GiftCard') return `/gift-cards/${id}`;
  return null;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    entity?: string;
    action?: string;
    from?: string;
    to?: string;
    cursor?: string;
  }>;
}): Promise<React.JSX.Element> {
  const { entity, action, from, to, cursor } = await searchParams;
  const [{ entries, nextCursor }, facets] = await Promise.all([
    loadAudit({ entity, action, from, to, cursor }),
    loadFacets(),
  ]);

  const filters: Array<{ id: string; label: string }> = [
    { id: '', label: 'Alle' },
    { id: 'Client', label: 'Kundinnen' },
    { id: 'Appointment', label: 'Termine' },
    { id: 'GiftCard', label: 'Gutscheine' },
  ];

  /** Bauet die Audit-URL zusammen mit aktuellen Filtern + 1 override. */
  function buildHref(override: Partial<{ entity: string; action: string; from: string; to: string }>): string {
    const qs = new URLSearchParams();
    const finalEntity = override.entity ?? entity;
    const finalAction = override.action ?? action;
    const finalFrom = override.from ?? from;
    const finalTo = override.to ?? to;
    if (finalEntity) qs.set('entity', finalEntity);
    if (finalAction) qs.set('action', finalAction);
    if (finalFrom) qs.set('from', finalFrom);
    if (finalTo) qs.set('to', finalTo);
    const s = qs.toString();
    return s ? `/audit?${s}` : '/audit';
  }

  return (
    <div className="w-full p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
            Compliance
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            Audit-Log
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Append-only Chronologie aller wichtigen Änderungen. Pflicht-Nachweis für DSGVO /
            Schweizer DSG.
          </p>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-md border border-border bg-surface p-0.5">
          {filters.map((f) => (
            <Link
              key={f.id}
              href={buildHref({ entity: f.id, action: '', from: '', to: '' })}
              className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                (entity ?? '') === f.id
                  ? 'bg-brand text-brand-foreground'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {facets.actions.length > 0 ? (
          <form method="GET" action="/audit" className="flex flex-wrap items-center gap-2">
            {entity ? <input type="hidden" name="entity" value={entity} /> : null}
            {from ? <input type="hidden" name="from" value={from} /> : null}
            {to ? <input type="hidden" name="to" value={to} /> : null}
            <select
              name="action"
              defaultValue={action ?? ''}
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs"
            >
              <option value="">Alle Aktionen</option>
              {facets.actions.map((a) => (
                <option key={a} value={a}>
                  {actionLabel[a]?.label ?? a}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="from"
              defaultValue={from ?? ''}
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs"
              aria-label="Von"
            />
            <input
              type="date"
              name="to"
              defaultValue={to ?? ''}
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs"
              aria-label="Bis"
            />
            <button
              type="submit"
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:border-accent/50"
            >
              Filtern
            </button>
            {(action || from || to) ? (
              <Link
                href={buildHref({ action: '', from: '', to: '' })}
                className="text-xs text-text-muted hover:text-accent"
              >
                Zurücksetzen
              </Link>
            ) : null}
          </form>
        ) : null}
      </div>

      <Card>
        {entries.length === 0 ? (
          <EmptyState
            title="Noch keine Einträge"
            description="Sobald Termine angelegt, umgebucht oder Kundinnen gelöscht werden, erscheinen die Aktionen hier."
          />
        ) : (
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-5 py-3">Zeit</th>
                  <th className="px-5 py-3">Entität</th>
                  <th className="px-5 py-3">Aktion</th>
                  <th className="px-5 py-3">Akteur</th>
                  <th className="px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const action = actionLabel[e.action] ?? {
                    label: e.action,
                    tone: 'neutral' as const,
                  };
                  const href = entityHref(e.entity, e.entityId);
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-border last:border-0 align-top transition-colors hover:bg-surface-raised/40"
                    >
                      <td className="whitespace-nowrap px-5 py-3 tabular-nums text-text-secondary">
                        {new Date(e.createdAt).toLocaleString('de-CH', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-5 py-3">
                        {href ? (
                          <Link
                            href={href}
                            className="font-medium text-text-primary hover:underline"
                          >
                            {entityLabel[e.entity] ?? e.entity}
                          </Link>
                        ) : (
                          <span className="font-medium text-text-primary">
                            {entityLabel[e.entity] ?? e.entity}
                          </span>
                        )}
                        <div className="font-mono text-[10px] text-text-muted">
                          {e.entityId.slice(0, 8)}…
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={action.tone}>{action.label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-xs text-text-secondary">
                        {e.actorType === 'USER' ? 'Team' : 'System'}
                        {e.actorId ? (
                          <div className="font-mono text-[10px] text-text-muted">
                            {e.actorId.slice(0, 8)}…
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-xs text-text-secondary">
                        {e.diff ? (
                          <details>
                            <summary className="cursor-pointer text-accent hover:underline">
                              Diff
                            </summary>
                            <pre className="mt-1 overflow-x-auto rounded bg-background/60 p-2 font-mono text-[10px]">
                              {JSON.stringify(e.diff, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        )}
      </Card>

      {nextCursor ? (
        <div className="mt-4 flex justify-center">
          <Link
            href={`${buildHref({})}${buildHref({}).includes('?') ? '&' : '?'}cursor=${nextCursor}`}
            className="text-xs font-medium text-accent hover:underline"
          >
            Ältere anzeigen →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
