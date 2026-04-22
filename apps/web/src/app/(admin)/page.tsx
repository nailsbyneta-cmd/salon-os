import Link from 'next/link';
import { Badge, Button, Card, CardBody, PriceDisplay, Stat } from '@salon-os/ui';
import { ConfirmApptButton } from '@/components/confirm-appt-button';
import { Sparkline } from '@/components/sparkline';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { transitionAppointment } from './calendar/actions';

interface BirthdayClient {
  id: string;
  firstName: string;
  lastName: string;
  birthday: string;
}

interface WinBackClient {
  id: string;
  firstName: string;
  lastName: string;
  lastVisitAt: string;
  totalVisits: number;
  lifetimeValue: number;
  phone: string | null;
  phoneE164: string | null;
}

interface Dashboard {
  servicesCount: number;
  staffCount: number;
  clientsCount: number;
  revenueLast7DaysCents: number[];
  giftCardsOutstanding: number;
  waitlistCount: number;
  lowStockCount: number;
  birthdaysToday: BirthdayClient[];
  winBack: WinBackClient[];
  zurichYear: string;
  todayAppts: Array<{
    id: string;
    startAt: string;
    endAt: string;
    status: string;
    client: {
      id?: string;
      firstName: string;
      lastName: string;
      phone?: string | null;
      phoneE164?: string | null;
      noShowRisk?: string | number | null;
      lifetimeValue?: string | number | null;
    } | null;
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
    safe(
      apiFetch<{
        clients: Array<{
          id: string;
          firstName: string;
          lastName: string;
          birthday: string | null;
          lastVisitAt: string | null;
          totalVisits: number;
          lifetimeValue: string | number;
          phone: string | null;
          phoneE164: string | null;
          blocked: boolean;
        }>;
      }>('/v1/clients?limit=5000', auth),
      { clients: [] },
    ),
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

  // Heutige Geburtstage — clientseitig filtern, weil die API keinen MM-DD-
  // Filter anbietet. Neta's Salon hat <2000 Kundinnen, Payload <500 KB.
  // WICHTIG: Datum in Europe/Zurich ermitteln — der API-Server läuft UTC,
  // und 22:00-24:00 CH wäre sonst schon der Folgetag (Geburtstage falsch).
  // Prisma-`@db.Date` serialisiert birthday als "YYYY-MM-DDT00:00:00.000Z";
  // slice(5,10) extrahiert konsistent MM-DD aus dem UTC-ISO, was zum UTC-
  // gespeicherten Date passt.
  const zurichParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const zYear = zurichParts.find((p) => p.type === 'year')?.value ?? '';
  const zMonth = zurichParts.find((p) => p.type === 'month')?.value ?? '';
  const zDay = zurichParts.find((p) => p.type === 'day')?.value ?? '';
  const mmdd = `${zMonth}-${zDay}`;
  // Win-Back-Liste: Stammkundinnen (>=5 Besuche, Lifetime >=300 CHF), die
  // seit 90+ Tagen nicht mehr da waren. Max 12, sortiert nach Lifetime DESC.
  // Neta ruft die persönlich durch — höheres Convert-Rate als Massen-Email.
  const WIN_BACK_CUTOFF_MS = 90 * 24 * 60 * 60 * 1000;
  const winBackNow = Date.now();
  const winBack: WinBackClient[] = cli.clients
    .filter((c) => {
      // Gesperrte Kundinnen nie als Win-Back-Ziel anschreiben.
      if (c.blocked) return false;
      if (!c.lastVisitAt) return false;
      if (c.totalVisits < 5) return false;
      const ltv = Number(c.lifetimeValue);
      if (!Number.isFinite(ltv) || ltv < 300) return false;
      const lastMs = new Date(c.lastVisitAt).getTime();
      if (!Number.isFinite(lastMs)) return false;
      return winBackNow - lastMs > WIN_BACK_CUTOFF_MS;
    })
    .map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      lastVisitAt: c.lastVisitAt as string,
      totalVisits: c.totalVisits,
      lifetimeValue: Number(c.lifetimeValue),
      phone: c.phone,
      phoneE164: c.phoneE164,
    }))
    .sort((a, b) => b.lifetimeValue - a.lifetimeValue)
    .slice(0, 12);

  const birthdaysToday: BirthdayClient[] = cli.clients
    .filter((c): c is { id: string; firstName: string; lastName: string; birthday: string } =>
      Boolean(c.birthday) &&
      typeof c.birthday === 'string' &&
      c.birthday.slice(5, 10) === mmdd,
    )
    .map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      birthday: c.birthday,
    }));

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
    birthdaysToday,
    winBack,
    zurichYear: zYear,
  };
}

function ageToday(birthday: string, zurichYear: string): number | null {
  // birthday im Format "YYYY-MM-DD" oder ISO-Datetime — MM-DD-Filter hat
  // bereits heute=birthday erzwungen, also nur die Jahres-Differenz.
  const iso = birthday.slice(0, 10);
  const [y] = iso.split('-').map(Number);
  if (!y) return null;
  const curYear = Number(zurichYear);
  if (!Number.isFinite(curYear)) return null;
  const age = curYear - y;
  return age >= 0 && age < 150 ? age : null;
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

  // Delta heute vs. Ø der aktiven letzten Tage. Guards:
  //  1. Mindestens 3 der 6 Vortage hatten Umsatz (sonst irreführend nach
  //     Schliesstagen/Ferien).
  //  2. Geschäftstag weit genug fortgeschritten (>=18:00 in Europe/Zurich) —
  //     vorher vergleicht man kumulierten Vormittag mit ganzen Vortagen,
  //     Ergebnis wäre konstant stark negativ.
  //  3. Divisor = Anzahl aktiver Tage, nicht 6 — Ostern-Pause verzerrt
  //     sonst künstlich positiv.
  const chHour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Zurich',
      hour: '2-digit',
      hour12: false,
    }).format(now),
  );
  const dayMostlyDone = Number.isFinite(chHour) && chHour >= 18;
  const prior6 = d.revenueLast7DaysCents.slice(0, 6);
  const prior6Active = prior6.filter((c) => c > 0);
  const prior6AvgCents =
    dayMostlyDone && prior6Active.length >= 3
      ? prior6Active.reduce((s, c) => s + c, 0) / prior6Active.length
      : null;
  const revenueDeltaPct =
    prior6AvgCents != null && prior6AvgCents > 0
      ? Math.round(((revenueCents - prior6AvgCents) / prior6AvgCents) * 100)
      : null;
  const upcoming = activeAppts
    .filter((a) => new Date(a.startAt) >= now && a.status !== 'IN_SERVICE')
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  // „Heute zu bestätigen": bevorstehende Termine mit noShowRisk >= 25 die
  // noch nicht bestätigt sind — Neta ruft sie morgen früh persönlich durch.
  const riskToConfirm = upcoming.filter((a) => {
    if (a.status !== 'BOOKED') return false;
    const risk =
      a.client?.noShowRisk != null ? Number(a.client.noShowRisk) : NaN;
    return Number.isFinite(risk) && risk >= 25;
  });

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
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/calendar/new?walkin=1">
            <Button variant="secondary">
              Walk-in
            </Button>
          </Link>
          <Link href="/calendar/new">
            <Button variant="primary" iconLeft={<span className="text-base leading-none">+</span>}>
              Neuer Termin
            </Button>
          </Link>
        </div>
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
          sub={
            revenueDeltaPct != null
              ? `CHF · ${revenueDeltaPct > 0 ? '+' : ''}${revenueDeltaPct}% vs. Ø 6 Tage`
              : 'CHF · exkl. storniert'
          }
          href="/reports?period=today"
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

      {d.birthdaysToday.length > 0 ? (
        <Card className="mb-4 border-l-4 border-l-accent bg-accent/5" elevation="flat">
          <CardBody>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                🎂 Heute Geburtstag · {d.birthdaysToday.length}{' '}
                {d.birthdaysToday.length === 1 ? 'Kundin' : 'Kundinnen'}
              </span>
            </div>
            <ul className="flex flex-wrap gap-2">
              {d.birthdaysToday.slice(0, 8).map((b) => {
                const age = ageToday(b.birthday, d.zurichYear);
                return (
                  <li key={b.id}>
                    <Link
                      href={`/clients/${b.id}`}
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-raised"
                    >
                      <span className="font-medium text-text-primary">
                        {b.firstName} {b.lastName}
                      </span>
                      {age != null ? (
                        <span className="text-xs tabular-nums text-text-muted">
                          {age}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {d.birthdaysToday.length > 8 ? (
              <p className="mt-2 text-xs text-text-muted">
                +{d.birthdaysToday.length - 8} weitere
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {riskToConfirm.length > 0 ? (
        <Card className="mb-4 border-l-4 border-l-warning bg-warning/5" elevation="flat">
          <CardBody>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-warning">
                ⚠ Heute zu bestätigen · {riskToConfirm.length}{' '}
                {riskToConfirm.length === 1 ? 'Termin' : 'Termine'}
              </span>
            </div>
            <p className="mb-3 text-xs text-text-secondary">
              Kundinnen mit erhöhtem No-Show-Risiko — kurz anrufen oder WhatsApp
              schreiben, dann via „Bestätigen" markieren.
            </p>
            <ul className="space-y-2">
              {riskToConfirm.slice(0, 5).map((a) => {
                const client = a.client;
                if (!client) return null;
                const clientName = `${client.firstName} ${client.lastName}`;
                const risk = Math.round(Number(client.noShowRisk));
                const riskTone = risk >= 40 ? 'bg-danger' : 'bg-warning';
                // wa.me erwartet E.164 ohne führendes +. Fallback: raw phone
                // normalisiert, falls phoneE164 fehlt (z.B. Import ohne
                // Normalisierung). Mindestlänge 7 um tel:-Junk auszuschliessen.
                const waDigits = client.phoneE164
                  ? client.phoneE164.replace(/^\+/, '')
                  : client.phone
                    ? client.phone.replace(/[^+\d]/g, '').replace(/^\+/, '')
                    : null;
                const telHref = client.phoneE164 ?? client.phone ?? null;
                const hasValidPhone =
                  telHref != null && waDigits != null && waDigits.length >= 7;
                return (
                  <li key={a.id}>
                    <div className="flex flex-wrap items-center gap-3 rounded-md bg-surface px-3 py-2.5">
                      <span className="w-14 shrink-0 text-sm font-semibold tabular-nums text-text-primary">
                        {new Date(a.startAt).toLocaleTimeString('de-CH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <Link
                        href={`/calendar/${a.id}`}
                        className="min-w-0 flex-1 hover:underline"
                      >
                        <div className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                          <span
                            className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none text-white ${riskTone}`}
                            title={`No-Show-Risiko ${risk}%`}
                            aria-hidden="true"
                          >
                            !
                          </span>
                          <span className="min-w-0 truncate">{clientName}</span>
                          <span className="shrink-0 text-xs text-text-muted tabular-nums">
                            {risk}%
                          </span>
                        </div>
                        <div className="truncate text-xs text-text-muted">
                          {a.items.map((i) => i.service.name).join(', ')} ·{' '}
                          {a.staff.firstName}
                        </div>
                      </Link>
                      <div className="flex shrink-0 gap-1.5">
                        {hasValidPhone ? (
                          <>
                            <a
                              href={`tel:${telHref}`}
                              className="inline-flex h-10 items-center gap-1 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-secondary hover:bg-surface-raised hover:text-text-primary md:h-9"
                              aria-label={`${clientName} anrufen`}
                            >
                              📞
                            </a>
                            <a
                              href={`https://wa.me/${waDigits}`}
                              target="_blank"
                              rel="noopener"
                              className="inline-flex h-10 items-center gap-1 rounded-md border border-success/30 bg-success/10 px-3 text-xs font-medium text-success hover:bg-success/20 md:h-9"
                              aria-label={`${clientName} auf WhatsApp schreiben`}
                            >
                              WA
                            </a>
                          </>
                        ) : (
                          <span className="text-[11px] text-text-muted">
                            keine Nummer
                          </span>
                        )}
                        <form
                          action={transitionAppointment.bind(null, a.id, 'confirm')}
                        >
                          <ConfirmApptButton
                            label={`Termin von ${clientName} bestätigen`}
                          />
                        </form>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {riskToConfirm.length > 5 ? (
              <p className="mt-3 text-xs text-text-muted">
                +{riskToConfirm.length - 5} weitere — im Kalender sichtbar.
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {d.winBack.length > 0 ? (
        <Card className="mb-4" elevation="flat">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">
              Vermisste Stammkundinnen · {d.winBack.length}
            </h2>
            <span className="text-xs text-text-muted">
              keine Besuche in 90+ Tagen
            </span>
          </div>
          <CardBody className="p-0">
            <ul className="divide-y divide-border">
              {d.winBack.slice(0, 6).map((w) => {
                const daysAway = Math.floor(
                  (now.getTime() - new Date(w.lastVisitAt).getTime()) /
                    86_400_000,
                );
                // Mirror der Heute-zu-bestätigen-Fallback-Logik: phoneE164
                // bevorzugt, raw phone normalisieren als Backup (Legacy-Daten
                // ohne phoneE164). Mindestens 7 Ziffern für gültige wa.me-URL.
                const waDigits = w.phoneE164
                  ? w.phoneE164.replace(/^\+/, '')
                  : w.phone
                    ? w.phone.replace(/[^+\d]/g, '').replace(/^\+/, '')
                    : null;
                const waUsable = waDigits != null && waDigits.length >= 7;
                return (
                  <li
                    key={w.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3"
                  >
                    <Link
                      href={`/clients/${w.id}`}
                      className="min-w-0 flex-1 hover:underline"
                    >
                      <div className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                        <span className="min-w-0 truncate">
                          {w.firstName} {w.lastName}
                        </span>
                      </div>
                      <div className="truncate text-xs text-text-muted">
                        Letzter Besuch vor {daysAway} Tagen · {w.totalVisits}{' '}
                        Besuche ·{' '}
                        {w.lifetimeValue.toLocaleString('de-CH', {
                          maximumFractionDigits: 0,
                        })}{' '}
                        CHF
                      </div>
                    </Link>
                    {waUsable ? (
                      <a
                        href={`https://wa.me/${waDigits}`}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex h-10 items-center gap-1 rounded-md border border-success/30 bg-success/10 px-3 text-xs font-medium text-success hover:bg-success/20 md:h-9"
                        aria-label={`${w.firstName} ${w.lastName} auf WhatsApp anschreiben (öffnet WhatsApp)`}
                      >
                        WA
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {d.winBack.length > 6 ? (
              <p className="px-5 py-3 text-xs text-text-muted">
                +{d.winBack.length - 6} weitere — in Kundinnen-Liste sichtbar.
              </p>
            ) : null}
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
