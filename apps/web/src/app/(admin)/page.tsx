import Link from 'next/link';
import { Badge, Button, Card, CardBody, PriceDisplay, Stat } from '@salon-os/ui';
import { Sparkline } from '@/components/sparkline';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface Dashboard {
  servicesCount: number;
  staffCount: number;
  clientsCount: number;
  revenueLast7DaysCents: number[];
  giftCardsOutstanding: number;
  waitlistCount: number;
  lowStockCount: number;
  todayAppts: Array<{
    id: string;
    startAt: string;
    endAt: string;
    status: string;
    client: { firstName: string; lastName: string } | null;
    staff: { firstName: string; lastName: string; color: string | null };
    items: Array<{ service: { name: string }; price: string }>;
  }>;
}

async function loadDashboard(): Promise<Dashboard> {
  const ctx = getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() - 6);

  const safe = <T,>(p: Promise<T>, fallback: T): Promise<T> =>
    p.catch((err) => {
      if (err instanceof ApiError) return fallback;
      throw err;
    });

  const [svc, stf, cli, appts, weekAppts, gc, wl, lowStock] = await Promise.all([
    safe(apiFetch<{ services: unknown[] }>('/v1/services', auth), { services: [] }),
    safe(apiFetch<{ staff: unknown[] }>('/v1/staff', auth), { staff: [] }),
    safe(apiFetch<{ clients: unknown[] }>('/v1/clients?limit=200', auth), { clients: [] }),
    safe(
      apiFetch<{ appointments: Dashboard['todayAppts'] }>(
        `/v1/appointments?from=${start.toISOString()}&to=${end.toISOString()}`,
        auth,
      ),
      { appointments: [] },
    ),
    safe(
      apiFetch<{
        appointments: Array<{
          startAt: string;
          status: string;
          items: Array<{ price: string }>;
        }>;
      }>(
        `/v1/appointments?from=${weekStart.toISOString()}&to=${end.toISOString()}`,
        auth,
      ),
      { appointments: [] },
    ),
    safe(
      apiFetch<{ giftCards: Array<{ balance: string }> }>('/v1/gift-cards', auth),
      { giftCards: [] },
    ),
    safe(apiFetch<{ entries: unknown[] }>('/v1/waitlist', auth), { entries: [] }),
    safe(
      apiFetch<{ products: unknown[] }>('/v1/products?lowStock=true', auth),
      { products: [] },
    ),
  ]);

  const revenueByDay = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    revenueByDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const a of weekAppts.appointments) {
    if (a.status === 'CANCELLED' || a.status === 'NO_SHOW') continue;
    const key = a.startAt.slice(0, 10);
    if (!revenueByDay.has(key)) continue;
    const cents = a.items.reduce(
      (s, i) => s + Math.round(Number(i.price) * 100),
      0,
    );
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + cents);
  }
  const revenueLast7DaysCents = Array.from(revenueByDay.values());

  return {
    servicesCount: svc.services.length,
    staffCount: stf.staff.length,
    clientsCount: cli.clients.length,
    revenueLast7DaysCents,
    giftCardsOutstanding: gc.giftCards.reduce(
      (s, c) => s + Number(c.balance),
      0,
    ),
    waitlistCount: wl.entries.length,
    lowStockCount: lowStock.products.length,
    todayAppts: appts.appointments,
  };
}

const greetingByHour = (h: number): string => {
  if (h < 5) return 'Gute Nacht';
  if (h < 11) return 'Guten Morgen';
  if (h < 17) return 'Hallo';
  if (h < 22) return 'Guten Abend';
  return 'Gute Nacht';
};

export default async function Home(): Promise<React.JSX.Element> {
  const d = await loadDashboard();
  const now = new Date();
  const greeting = greetingByHour(now.getHours());

  const activeAppts = d.todayAppts.filter(
    (a) => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW',
  );
  const revenueCents = activeAppts.reduce(
    (sum, a) =>
      sum + a.items.reduce((s, i) => s + Math.round(Number(i.price) * 100), 0),
    0,
  );
  const completed = activeAppts.filter((a) => a.status === 'COMPLETED').length;
  const running = activeAppts.filter((a) => a.status === 'IN_SERVICE');
  const upcoming = activeAppts
    .filter((a) => new Date(a.startAt) >= now && a.status !== 'IN_SERVICE')
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
            Dashboard
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            {greeting}, Neta 👋
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {now.toLocaleDateString('de-CH', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
            {' · '}
            {completed} von {activeAppts.length} Terminen abgeschlossen
          </p>
        </div>
        <Link href="/calendar/new">
          <Button variant="primary" iconLeft={<span className="text-base leading-none">+</span>}>
            Neuer Termin
          </Button>
        </Link>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Termine heute"
          value={activeAppts.length}
          sub={activeAppts.length === 0 ? 'frei' : `${completed} fertig`}
          href="/calendar"
        />
        <Stat
          label="Umsatz heute"
          value={(revenueCents / 100).toLocaleString('de-CH', {
            minimumFractionDigits: 0,
          })}
          sub="CHF · exkl. storniert"
        />
        <Stat label="Kundinnen" value={d.clientsCount} href="/clients" />
        <Stat label="Services" value={d.servicesCount} href="/services" />
      </section>

      <Card className="mb-4" elevation="flat">
        <CardBody className="flex flex-wrap items-end justify-between gap-4 sm:gap-6">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Umsatz · letzte 7 Tage
            </div>
            <div className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {(
                d.revenueLast7DaysCents.reduce((s, c) => s + c, 0) / 100
              ).toLocaleString('de-CH', { minimumFractionDigits: 0 })}{' '}
              <span className="text-sm font-normal text-text-muted">CHF</span>
            </div>
            <div className="mt-0.5 text-xs text-text-muted">
              Ø{' '}
              {(
                d.revenueLast7DaysCents.reduce((s, c) => s + c, 0) /
                700
              ).toLocaleString('de-CH', { maximumFractionDigits: 0 })}{' '}
              CHF pro Tag
            </div>
          </div>
          <Sparkline data={d.revenueLast7DaysCents} width={240} height={56} />
        </CardBody>
      </Card>

      <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        <Stat
          label="Warteliste"
          value={d.waitlistCount}
          sub={d.waitlistCount === 0 ? 'Niemand wartet' : 'Kundinnen eintragen'}
          href="/waitlist"
        />
        <Stat
          label="Gutscheine offen"
          value={`${d.giftCardsOutstanding.toFixed(0)} CHF`}
          sub="Aktives Guthaben"
          href="/gift-cards"
        />
        <Stat
          label="Low Stock"
          value={d.lowStockCount}
          sub={
            d.lowStockCount === 0
              ? 'Alles auf Lager'
              : 'Produkte nachbestellen'
          }
          href="/inventory"
        />
      </section>

      {running.length > 0 ? (
        <Card className="mb-4 border-l-4 border-l-accent bg-accent/5" elevation="flat">
          <CardBody>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-accent motion-safe:animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                Grade läuft · {running.length} {running.length === 1 ? 'Termin' : 'Termine'}
              </span>
            </div>
            <ul className="space-y-2">
              {running.map((a) => {
                const startMs = new Date(a.startAt).getTime();
                const elapsedMin = Math.max(
                  0,
                  Math.floor((now.getTime() - startMs) / 60000),
                );
                const totalMin =
                  (new Date(a.endAt).getTime() - startMs) / 60000;
                const pct = Math.min(
                  100,
                  Math.max(0, (elapsedMin / totalMin) * 100),
                );
                const client = a.client
                  ? `${a.client.firstName} ${a.client.lastName}`
                  : 'Blockzeit';
                return (
                  <li key={a.id}>
                    <Link
                      href={`/calendar/${a.id}`}
                      className="block rounded-md bg-surface px-3 py-2 transition-colors hover:bg-surface-raised"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {client}
                        </span>
                        <span className="text-xs tabular-nums text-text-muted">
                          {elapsedMin} / {Math.round(totalMin)} Min
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-text-muted truncate">
                        {a.items.map((i) => i.service.name).join(', ')} ·{' '}
                        {a.staff.firstName}
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-raised">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2" elevation="flat">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Heute bevorstehend</h2>
            <Link
              href="/calendar"
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Alle →
            </Link>
          </div>
          <CardBody className="p-0">
            {upcoming.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-text-muted">
                Keine weiteren Termine heute.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.slice(0, 5).map((a) => {
                  const client = a.client
                    ? `${a.client.firstName} ${a.client.lastName}`
                    : 'Blockzeit';
                  const services =
                    a.items.map((i) => i.service.name).join(', ') || '—';
                  const total = a.items.reduce(
                    (s, i) => s + Number(i.price),
                    0,
                  );
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/calendar/${a.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-raised/60"
                      >
                        <div className="w-16 shrink-0">
                          <div className="text-sm font-semibold tabular-nums text-text-primary">
                            {new Date(a.startAt).toLocaleTimeString('de-CH', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="text-[10px] text-text-muted tabular-nums">
                            {new Date(a.endAt).toLocaleTimeString('de-CH', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                        <div
                          className="h-10 w-0.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: a.staff.color ?? 'hsl(var(--border-strong))',
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text-primary truncate">
                            {client}
                          </div>
                          <div className="text-xs text-text-muted truncate">
                            {services} · {a.staff.firstName}
                          </div>
                        </div>
                        <PriceDisplay amount={total} size="sm" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card elevation="hoverable">
            <CardBody>
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">
                Online-Booking
              </div>
              <h3 className="text-lg font-semibold">Kundenseite</h3>
              <p className="mt-1 text-xs text-text-secondary">
                Teile den Link, wo auch immer — Kundinnen buchen direkt in den
                Kalender.
              </p>
              <Link
                href="/book/beautycenter-by-neta"
                target="_blank"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                Öffnen →
              </Link>
            </CardBody>
          </Card>

          <Card elevation="hoverable">
            <CardBody>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Tip
                </span>
                <Badge tone="accent" dot>
                  Neu
                </Badge>
              </div>
              <h3 className="text-lg font-semibold">⌘K Command Palette</h3>
              <p className="mt-1 text-xs text-text-secondary">
                Cmd/Ctrl + K öffnet Schnell-Suche. Termine, Kunden, Services —
                alles in 3 Tastenanschlägen.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
