import Link from 'next/link';
import { Avatar, Badge, Button, Card, CardBody, EmptyState, cn } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { ClientSearchInline } from '@/components/client-search-inline';
import { getCurrentTenant } from '@/lib/tenant';

interface ClientRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  phoneE164?: string | null;
  lastVisitAt: string | null;
  totalVisits: number;
  tags: string[];
  lifetimeValue: string | number;
  marketingOptIn: boolean;
  noShowRisk?: string | number | null;
}

type FilterKey = 'all' | 'faellig' | 'vip' | 'stamm' | 'neu' | 'risiko' | 'marketing';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Alle' },
  { key: 'faellig', label: 'Fällig für Follow-up' },
  { key: 'vip', label: 'VIP (ab Gold)' },
  { key: 'stamm', label: 'Stammkundinnen (10+)' },
  { key: 'neu', label: 'Neu (0 Besuche)' },
  { key: 'risiko', label: 'No-Show-Risiko' },
  { key: 'marketing', label: 'Marketing-Opt-in' },
];

function riskOf(c: ClientRow): number {
  return c.noShowRisk != null ? Number(c.noShowRisk) : 0;
}

// Fällig: ≥ 2 Besuche + letzter Besuch > 45 Tage her + Marketing-Opt-in.
// Heuristisch simpel weil die Kundenliste keine Termin-Historie für
// echte Visit-Cadence hat — die grobe Regel reicht für 'bitte melden'-
// Entscheidungen. Strengere Logik (Win-Back, Cadence) bleibt im
// Dashboard + Client-Detail.
const FAELLIG_GRACE_DAYS = 45;

function isFaellig(c: ClientRow): boolean {
  if (c.totalVisits < 2) return false;
  if (!c.marketingOptIn) return false;
  if (!c.lastVisitAt) return false;
  const lastMs = new Date(c.lastVisitAt).getTime();
  if (!Number.isFinite(lastMs)) return false;
  const ageDays = (Date.now() - lastMs) / 86_400_000;
  return ageDays >= FAELLIG_GRACE_DAYS;
}

function applyFilter(clients: ClientRow[], f: FilterKey): ClientRow[] {
  switch (f) {
    case 'faellig':
      return clients.filter(isFaellig);
    case 'vip':
      return clients.filter((c) => Number(c.lifetimeValue) >= 2000);
    case 'stamm':
      return clients.filter((c) => c.totalVisits >= 10);
    case 'neu':
      return clients.filter((c) => c.totalVisits === 0);
    case 'risiko':
      return clients.filter((c) => riskOf(c) >= 25);
    case 'marketing':
      return clients.filter((c) => c.marketingOptIn);
    case 'all':
    default:
      return clients;
  }
}

function phoneLinks(c: ClientRow & { phoneE164?: string | null }): {
  tel: string | null;
  wa: string | null;
} {
  const e164 = c.phoneE164 ?? null;
  const telHref = e164 ?? c.phone ?? null;
  const digits = e164
    ? e164.replace(/^\+/, '')
    : c.phone
      ? c.phone.replace(/[^+\d]/g, '').replace(/^\+/, '')
      : null;
  const hasPhone = telHref != null && digits != null && digits.length >= 7;
  return {
    tel: hasPhone ? telHref : null,
    wa: hasPhone ? digits : null,
  };
}

async function loadClients(q?: string): Promise<ClientRow[]> {
  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<{ clients: ClientRow[] }>(
      `/v1/clients${q ? `?q=${encodeURIComponent(q)}&limit=500` : '?limit=500'}`,
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
    return res.clients;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}): Promise<React.JSX.Element> {
  const { q, filter } = await searchParams;
  const filterKey: FilterKey = (
    FILTERS.some((f) => f.key === filter) ? filter : 'all'
  ) as FilterKey;
  const allClients = await loadClients(q);
  const clients = applyFilter(allClients, filterKey);

  return (
    <div className="w-full p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">CRM</p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            Kundinnen
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {clients.length} von {allClients.length}{' '}
            {allClients.length === 1 ? 'Kundin' : 'Kundinnen'}
            {filterKey !== 'all' ? ` · ${FILTERS.find((f) => f.key === filterKey)?.label}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClientSearchInline initialQ={q ?? ''} />
          <Link
            href="/clients/import"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-secondary hover:bg-surface-raised"
          >
            ↑ Import
          </Link>
          <a
            href="/api/clients/export"
            download
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-secondary hover:bg-surface-raised"
          >
            ↓ CSV
          </a>
          <Link href="/clients/new">
            <Button variant="primary" iconLeft={<span className="text-base leading-none">+</span>}>
              Neue Kundin
            </Button>
          </Link>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const qs = new URLSearchParams();
          if (q) qs.set('q', q);
          if (f.key !== 'all') qs.set('filter', f.key);
          const href = qs.toString() ? `/clients?${qs.toString()}` : '/clients';
          const count = f.key === 'all' ? allClients.length : applyFilter(allClients, f.key).length;
          return (
            <Link
              key={f.key}
              href={href}
              className={cn(
                'inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors',
                filterKey === f.key
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-border bg-surface text-text-secondary hover:border-accent hover:text-text-primary',
              )}
            >
              {f.label}
              <span
                className={cn('tabular-nums', filterKey === f.key ? 'opacity-80' : 'opacity-60')}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      <Card>
        {clients.length === 0 ? (
          <EmptyState
            title={q ? `Keine Treffer für „${q}"` : 'Noch keine Kundinnen'}
            description="Lege neue an oder importiere eine CSV aus Phorest/Fresha."
          />
        ) : (
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Name</th>
                  <th className="hidden px-4 py-3 sm:table-cell sm:px-5">Kontakt</th>
                  <th className="hidden px-4 py-3 md:table-cell md:px-5">Letzter Besuch</th>
                  <th className="px-4 py-3 text-right sm:px-5">Besuche</th>
                  <th className="hidden px-4 py-3 lg:table-cell lg:px-5">Tags</th>
                  {filterKey === 'faellig' ? (
                    <th className="px-2 py-3 text-right sm:px-5">Kontakt</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const risk = riskOf(c);
                  const riskTier: 'hoch' | 'mittel' | null =
                    risk >= 40 ? 'hoch' : risk >= 25 ? 'mittel' : null;
                  const isVip = Number(c.lifetimeValue) >= 2000;
                  const a11y = [
                    riskTier === 'hoch' ? 'hohes No-Show-Risiko' : null,
                    riskTier === 'mittel' ? 'mittleres No-Show-Risiko' : null,
                    isVip ? 'VIP' : null,
                  ]
                    .filter(Boolean)
                    .join(', ');
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-0 transition-colors hover:bg-surface-raised/60"
                    >
                      <td className="px-4 py-3 sm:px-5">
                        <Link
                          href={`/clients/${c.id}`}
                          className="flex items-center gap-3 font-medium text-text-primary hover:underline"
                          aria-label={a11y ? `${c.firstName} ${c.lastName} — ${a11y}` : undefined}
                        >
                          <Avatar
                            name={`${c.firstName} ${c.lastName}`}
                            size="sm"
                            color="hsl(var(--brand-accent))"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex min-w-0 items-center gap-1.5">
                              {riskTier === 'hoch' ? (
                                <span
                                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-danger text-[10px] font-bold leading-none text-white"
                                  title={`No-Show-Risiko ${Math.round(risk)}%`}
                                  aria-hidden="true"
                                >
                                  !
                                </span>
                              ) : riskTier === 'mittel' ? (
                                <span
                                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-warning text-[10px] font-bold leading-none text-white"
                                  title={`No-Show-Risiko ${Math.round(risk)}%`}
                                  aria-hidden="true"
                                >
                                  !
                                </span>
                              ) : null}
                              {isVip ? (
                                <span
                                  className="shrink-0 text-sm leading-none text-accent"
                                  title="VIP (Lifetime >= 2000 CHF)"
                                  aria-hidden="true"
                                >
                                  ★
                                </span>
                              ) : null}
                              <span className="min-w-0 truncate">
                                {c.firstName} {c.lastName}
                              </span>
                            </span>
                            {/* Kontakt auf Mobile unter den Namen */}
                            <span className="mt-0.5 block truncate text-xs font-normal text-text-muted sm:hidden">
                              {c.email ?? c.phone ?? '—'}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="hidden px-4 py-3 text-text-secondary sm:table-cell sm:px-5">
                        {c.email ?? '—'}
                        {c.phone ? <span className="ml-2 text-text-muted">· {c.phone}</span> : null}
                      </td>
                      <td className="hidden px-4 py-3 text-text-secondary md:table-cell md:px-5">
                        {c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleDateString('de-CH') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium sm:px-5">
                        {c.totalVisits}
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell lg:px-5">
                        <div className="flex flex-wrap gap-1">
                          {c.tags.slice(0, 3).map((t) => (
                            <Badge key={t} tone="neutral">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      {filterKey === 'faellig'
                        ? (() => {
                            const { tel, wa } = phoneLinks(c);
                            const waText = encodeURIComponent(
                              `Liebe ${c.firstName}, ich denk grad an dich — Zeit für einen neuen Termin? — Beautycenter by Neta`,
                            );
                            return (
                              <td className="px-2 py-3 text-right sm:px-5">
                                <div
                                  className="inline-flex gap-1.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {tel ? (
                                    <a
                                      href={`tel:${tel}`}
                                      aria-label={`${c.firstName} ${c.lastName} anrufen`}
                                      className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                                    >
                                      📞
                                    </a>
                                  ) : null}
                                  {wa ? (
                                    <a
                                      href={`https://wa.me/${wa}?text=${waText}`}
                                      target="_blank"
                                      rel="noopener"
                                      aria-label={`${c.firstName} ${c.lastName} auf WhatsApp anschreiben`}
                                      className="inline-flex h-9 items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2.5 text-xs font-medium text-success hover:bg-success/20"
                                    >
                                      WA
                                    </a>
                                  ) : null}
                                  {!tel && !wa ? (
                                    <span className="text-[10px] text-text-muted">keine Nr.</span>
                                  ) : null}
                                </div>
                              </td>
                            );
                          })()
                        : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        )}
      </Card>
    </div>
  );
}
