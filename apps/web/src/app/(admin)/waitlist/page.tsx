import Link from 'next/link';
import { Avatar, Badge, Button, Card, CardBody, EmptyState } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { cancelWaitlist, fulfillWaitlist } from './actions';

interface Entry {
  id: string;
  earliestAt: string;
  latestAt: string;
  notes: string | null;
  status: string;
  createdAt: string;
  client: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    phoneE164?: string | null;
  };
  service: { name: string };
  staff: { firstName: string; lastName: string } | null;
}

async function load(): Promise<Entry[]> {
  const ctx = await getCurrentTenant();
  try {
    const res = await apiFetch<{ entries: Entry[] }>('/v1/waitlist', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return res.entries;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

function fmtRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  const fmtDate = (d: Date): string =>
    d.toLocaleDateString('de-CH', { day: '2-digit', month: 'short' });
  const fmtTime = (d: Date): string =>
    d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  return sameDay
    ? `${fmtDate(s)}  ${fmtTime(s)}–${fmtTime(e)}`
    : `${fmtDate(s)} ${fmtTime(s)} → ${fmtDate(e)} ${fmtTime(e)}`;
}

function daysWaiting(createdAt: string): number {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export default async function WaitlistPage(): Promise<React.JSX.Element> {
  const rawEntries = await load();
  // Sortieren: erst nach earliestAt (nächste-Priorität), dann nach Alter
  // (ältere vorn bei gleichem Zeitfenster) — so sieht Neta oben wer am
  // dringendsten wartet.
  const entries = [...rawEntries].sort((a, b) => {
    const t = new Date(a.earliestAt).getTime() - new Date(b.earliestAt).getTime();
    if (t !== 0) return t;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <div className="w-full p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
            Warteliste
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            Warten auf Termin
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {entries.length} aktiv — wird ein Slot frei, ruf hier an.
          </p>
        </div>
        <Link href="/waitlist/new">
          <Button variant="primary" iconLeft={<span className="text-base leading-none">+</span>}>
            Neuer Eintrag
          </Button>
        </Link>
      </header>

      {entries.length === 0 ? (
        <Card>
          <EmptyState
            title="Warteliste leer"
            description="Wenn Kundinnen über die öffentliche Booking-Seite keinen passenden Slot finden, können sie sich hier eintragen lassen."
          />
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-border">
              {entries.map((e) => {
                const name = `${e.client.firstName} ${e.client.lastName}`;
                const fulfill = fulfillWaitlist.bind(null, e.id);
                const cancel = cancelWaitlist.bind(null, e.id);
                const telHref = e.client.phoneE164 ?? e.client.phone ?? null;
                const waDigits = e.client.phoneE164
                  ? e.client.phoneE164.replace(/^\+/, '')
                  : e.client.phone
                    ? e.client.phone.replace(/[^+\d]/g, '').replace(/^\+/, '')
                    : null;
                const hasPhone = telHref != null && waDigits != null && waDigits.length >= 7;
                return (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-raised/40"
                  >
                    <Avatar name={name} size="md" color="hsl(var(--brand-accent))" />
                    <div className="min-w-[220px] flex-1">
                      <div className="font-medium text-text-primary">{name}</div>
                      <div className="text-xs text-text-muted">
                        {e.client.email ?? '—'}
                        {e.client.phone ? ` · ${e.client.phone}` : ''}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <Badge tone="accent">{e.service.name}</Badge>
                        {e.staff ? (
                          <Badge tone="neutral">
                            bei {e.staff.firstName} {e.staff.lastName[0]}.
                          </Badge>
                        ) : null}
                        {(() => {
                          const d = daysWaiting(e.createdAt);
                          if (d === 0) return null;
                          const tone = d >= 14 ? 'warning' : 'neutral';
                          return (
                            <Badge tone={tone}>
                              wartet {d} {d === 1 ? 'Tag' : 'Tagen'}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-medium text-text-primary tabular-nums">
                        {fmtRange(e.earliestAt, e.latestAt)}
                      </div>
                      {e.notes ? (
                        <div className="mt-0.5 max-w-[220px] truncate text-text-muted">
                          „{e.notes}"
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {hasPhone ? (
                        <>
                          <a
                            href={`tel:${telHref}`}
                            className="inline-flex h-10 items-center gap-1 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-secondary hover:bg-surface-raised hover:text-text-primary md:h-9"
                            aria-label={`${name} anrufen`}
                          >
                            📞
                          </a>
                          <a
                            href={`https://wa.me/${waDigits}`}
                            target="_blank"
                            rel="noopener"
                            className="inline-flex h-10 items-center gap-1 rounded-md border border-success/30 bg-success/10 px-3 text-xs font-medium text-success hover:bg-success/20 md:h-9"
                            aria-label={`${name} auf WhatsApp anschreiben (öffnet WhatsApp)`}
                          >
                            WA
                          </a>
                        </>
                      ) : null}
                      <form action={fulfill}>
                        <Button type="submit" variant="accent" size="sm">
                          Termin gefunden
                        </Button>
                      </form>
                      <form action={cancel}>
                        <Button type="submit" variant="ghost" size="sm">
                          Entfernen
                        </Button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
