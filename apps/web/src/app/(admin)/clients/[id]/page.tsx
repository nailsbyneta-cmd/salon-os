import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Badge, Button, Card, CardBody, Stat } from '@salon-os/ui';
import { computeLoyalty } from '@salon-os/utils';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { BlockToggleButton } from '@/components/block-toggle-button';
import { forgetClient } from './actions';
import { LoyaltyCard } from './loyalty-card';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  phoneE164?: string | null;
  gender: string | null;
  birthday: string | null;
  notesInternal: string | null;
  tags: string[];
  totalVisits: number;
  // API liefert das Feld als `lifetimeValue`. `totalSpent` ist der UI-
  // interne Alias; beide als optional damit fehlende Daten nicht zu
  // NaN werden.
  totalSpent?: string | number | null;
  lifetimeValue?: string | number | null;
  lastVisitAt: string | null;
  createdAt: string;
  noShowRisk: string | null;
  blocked: boolean;
}

interface Appt {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  staffId: string;
  staff: { firstName: string; lastName: string };
  items: Array<{ serviceId: string; service: { name: string } }>;
}

async function loadClient(id: string): Promise<Client | null> {
  const ctx = await getCurrentTenant();
  try {
    return await apiFetch<Client>(`/v1/clients/${id}`, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

interface LoyaltyBalance {
  clientId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  rewardsAvailable: number;
}

interface LoyaltyStamp {
  id: string;
  delta: number;
  balanceAfter: number;
  reason: string;
  notes: string | null;
  createdAt: string;
}

interface LoyaltyProgram {
  id: string;
  name: string;
  active: boolean;
  earnRule: 'per_appointment' | 'per_chf';
  earnPerUnit: number;
  redeemThreshold: number;
  rewardLabel: string;
}

async function loadLoyalty(clientId: string): Promise<{
  program: LoyaltyProgram | null;
  balance: LoyaltyBalance | null;
  stamps: LoyaltyStamp[];
}> {
  const ctx = await getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };
  const safe = async <T,>(p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch (err) {
      if (err instanceof ApiError) return fallback;
      throw err;
    }
  };
  const [programRes, balance, stampsRes] = await Promise.all([
    safe(apiFetch<{ program: LoyaltyProgram | null }>('/v1/loyalty/program', auth), {
      program: null,
    }),
    safe(apiFetch<LoyaltyBalance>(`/v1/loyalty/clients/${clientId}`, auth), null),
    safe(
      apiFetch<{ stamps: LoyaltyStamp[] }>(`/v1/loyalty/clients/${clientId}/stamps?limit=10`, auth),
      {
        stamps: [],
      },
    ),
  ]);
  return {
    program: programRes.program,
    balance,
    stamps: stampsRes.stamps,
  };
}

async function loadClientAppointments(clientId: string): Promise<Appt[]> {
  const ctx = await getCurrentTenant();
  const from = new Date();
  from.setFullYear(from.getFullYear() - 2);
  const to = new Date();
  to.setFullYear(to.getFullYear() + 1);
  try {
    const res = await apiFetch<{ appointments: Appt[] }>(
      `/v1/appointments?from=${from.toISOString()}&to=${to.toISOString()}&clientId=${clientId}`,
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
    return res.appointments.sort(
      (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
    );
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

const statusTone: Record<string, 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'accent'> =
  {
    BOOKED: 'info',
    CONFIRMED: 'success',
    CHECKED_IN: 'warning',
    IN_SERVICE: 'accent',
    COMPLETED: 'neutral',
    CANCELLED: 'danger',
    NO_SHOW: 'danger',
    WAITLIST: 'neutral',
  };

const statusLabel: Record<string, string> = {
  BOOKED: 'Gebucht',
  CONFIRMED: 'Bestätigt',
  CHECKED_IN: 'Eingecheckt',
  IN_SERVICE: 'Läuft',
  COMPLETED: 'Abgeschlossen',
  CANCELLED: 'Storniert',
  NO_SHOW: 'Nicht erschienen',
  WAITLIST: 'Warteliste',
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const [client, appts, loyaltyData] = await Promise.all([
    loadClient(id),
    loadClientAppointments(id),
    loadLoyalty(id),
  ]);
  if (!client) notFound();

  const upcoming = appts.filter((a) => new Date(a.startAt) >= new Date());
  const past = appts.filter((a) => new Date(a.startAt) < new Date());
  const lifetimeChf = Number(client.lifetimeValue ?? client.totalSpent ?? 0) || 0;
  const loyalty = computeLoyalty(lifetimeChf);

  // Top-3 Service-Präferenzen — nur aus COMPLETED-Terminen zählen, storniert
  // + no-show ignorieren (sind kein ehrliches Signal für 'mag diesen Service').
  // Alle Services des Termins zählen (multi-item Checkout).
  // Key = serviceId statt name, damit Umbenennungen oder zwei Services mit
  // gleichem Namen (z. B. 'Maniküre') nicht fälschlich kollabieren.
  // Sort ist stabil: past ist nach startAt DESC (recent wins bei Gleichstand).
  const serviceCounts = new Map<string, { name: string; count: number }>();
  for (const a of past) {
    if (a.status !== 'COMPLETED') continue;
    for (const item of a.items) {
      const prev = serviceCounts.get(item.serviceId);
      serviceCounts.set(item.serviceId, {
        name: item.service.name,
        count: (prev?.count ?? 0) + 1,
      });
    }
  }
  const topServices = Array.from(serviceCounts.entries())
    .map(([serviceId, v]) => ({ serviceId, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Visit-Cadence: durchschnittliches Intervall zwischen COMPLETED-Terminen
  // und prediction des nächsten Besuchs. Mindestens 3 completed + 2 Intervalle
  // ≥1 Tag — weniger ist statistisches Rauschen. Zeigt Neta proaktiv welche
  // Kundin fällig ist.
  const completedPast = past
    .filter((a) => a.status === 'COMPLETED')
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  let cadence: {
    avgDays: number;
    diffDays: number;
    overdue: boolean;
    stale: boolean;
  } | null = null;
  if (completedPast.length >= 3) {
    const diffsMs: number[] = [];
    for (let i = 1; i < completedPast.length; i++) {
      const prev = new Date(completedPast[i - 1]!.startAt).getTime();
      const curr = new Date(completedPast[i]!.startAt).getTime();
      const delta = curr - prev;
      // Same-day-Visits (Cut + Brauen am gleichen Tag) sind kein echter
      // Rhythmus-Signal — verzerren den Durchschnitt stark.
      if (delta >= 86_400_000) diffsMs.push(delta);
    }
    if (diffsMs.length >= 2) {
      const avgMs = diffsMs.reduce((s, d) => s + d, 0) / diffsMs.length;
      const avgDays = Math.round(avgMs / 86_400_000);
      const lastVisitMs = new Date(completedPast[completedPast.length - 1]!.startAt).getTime();
      const predictedNextMs = lastVisitMs + avgMs;
      const diffMs = predictedNextMs - Date.now();
      const diffDays = Math.round(diffMs / 86_400_000);
      // Wenn letzter Besuch länger als 3× Avg her ist → Churn, nicht
      // 'überfällig'. Avg-Prediction macht dann keinen Sinn mehr.
      const stale = Date.now() - lastVisitMs > 3 * avgMs;
      cadence = { avgDays, diffDays, overdue: diffDays < 0, stale };
    }
  }

  // Deutsche Pluralisierung für Tag/Woche.
  const tag = (n: number): string => `${n} ${n === 1 ? 'Tag' : 'Tagen'}`;
  const woche = (n: number): string => `${n} ${n === 1 ? 'Woche' : 'Wochen'}`;

  return (
    <div className="mx-auto w-full max-w-[1400px] p-4 md:p-8">
      <Link
        href="/clients"
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Alle Kundinnen
      </Link>

      <header className="mb-8 mt-4 flex items-start gap-5">
        <Avatar
          name={`${client.firstName} ${client.lastName}`}
          size="xl"
          color="hsl(var(--brand-accent))"
          vip={client.totalVisits >= 10}
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
                Kundin
              </p>
              <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
                {client.firstName} {client.lastName}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/calendar/new?clientId=${client.id}`}
                className="inline-flex h-9 items-center rounded-md bg-brand px-3 text-xs font-medium text-brand-foreground transition-colors hover:bg-brand/90"
              >
                + Neuer Termin
              </Link>
              <Link
                href={`/clients/${client.id}/edit`}
                className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-secondary hover:bg-surface-raised"
              >
                Bearbeiten
              </Link>
              <BlockToggleButton
                clientId={client.id}
                currentBlocked={client.blocked}
                clientName={`${client.firstName} ${client.lastName}`}
              />
            </div>
          </div>
          {client.blocked ? (
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
              <span aria-hidden="true">🔒</span>
              Gesperrt — nicht für automatische Kontakte (Geburtstag, Win-Back, Waitlist-Match)
            </div>
          ) : null}
          <p className="mt-1 text-sm text-text-secondary">
            {client.email ? (
              <a href={`mailto:${client.email}`} className="hover:text-accent hover:underline">
                {client.email}
              </a>
            ) : (
              '—'
            )}
            {client.phone ? (
              <>
                {' · '}
                <a href={`tel:${client.phone}`} className="hover:text-accent hover:underline">
                  {client.phone}
                </a>
              </>
            ) : null}
          </p>
          {client.phone || client.email ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {client.phone ? (
                <>
                  <a
                    href={`tel:${client.phone}`}
                    className="inline-flex h-11 items-center gap-1 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                  >
                    📞 Anrufen
                  </a>
                  <a
                    href={`sms:${client.phone}`}
                    className="inline-flex h-11 items-center gap-1 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                  >
                    💬 SMS
                  </a>
                  <a
                    href={`https://wa.me/${(client.phoneE164 ?? client.phone).replace(/[^+\d]/g, '').replace(/^\+/, '')}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex h-11 items-center gap-1 rounded-md border border-success/30 bg-success/10 px-3 text-xs font-medium text-success transition-colors hover:bg-success/20"
                  >
                    WhatsApp
                  </a>
                </>
              ) : null}
              {client.email ? (
                <a
                  href={`mailto:${client.email}`}
                  className="inline-flex h-11 items-center gap-1 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                >
                  ✉ E-Mail
                </a>
              ) : null}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge
              tone={
                loyalty.tier.id === 'PLATIN' || loyalty.tier.id === 'GOLD'
                  ? 'accent'
                  : loyalty.tier.id === 'SILBER'
                    ? 'info'
                    : 'neutral'
              }
              dot
            >
              {loyalty.tier.label} · {loyalty.points} Pkt
            </Badge>
            {client.noShowRisk !== null && Number(client.noShowRisk) >= 40 ? (
              <Badge tone="warning" dot>
                ⚠ No-Show-Risiko {Math.round(Number(client.noShowRisk))}%
              </Badge>
            ) : null}
            {client.tags.map((t) => (
              <Badge key={t} tone="accent">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat label="Besuche" value={client.totalVisits} />
        <Stat
          label="Umsatz total"
          value={`${lifetimeChf.toLocaleString('de-CH', { minimumFractionDigits: 2 })} CHF`}
        />
        <Stat
          label="Letzter Besuch"
          value={
            client.lastVisitAt
              ? new Date(client.lastVisitAt).toLocaleDateString('de-CH', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'
          }
        />
        <Stat
          label="No-Show-Risiko"
          value={
            client.noShowRisk !== null && Number.isFinite(Number(client.noShowRisk))
              ? `${Math.round(Number(client.noShowRisk))}%`
              : '—'
          }
          sub={
            client.noShowRisk !== null && Number(client.noShowRisk) >= 40
              ? 'hoch — vorher bestätigen'
              : client.noShowRisk !== null && Number(client.noShowRisk) >= 25
                ? 'mittel'
                : undefined
          }
        />
      </section>

      <Card className="mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent px-5 py-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                Treue-Status
              </p>
              <p className="mt-1 text-2xl font-display font-semibold">{loyalty.tier.label}</p>
              <p className="mt-0.5 text-xs text-text-secondary">{loyalty.tier.benefitHint}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tabular-nums text-text-primary">{loyalty.points}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Punkte
              </p>
            </div>
          </div>
        </div>
        {loyalty.nextTier ? (
          <CardBody className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">
                {loyalty.tier.label} → {loyalty.nextTier.label}
              </span>
              <span className="tabular-nums font-medium text-text-primary">
                noch {loyalty.toNextCHF?.toFixed(0) ?? '—'} CHF
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-slow ease-out-expo"
                style={{ width: `${Math.round(loyalty.progressInTier * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-text-muted">
              Nächster Vorteil: {loyalty.nextTier.benefitHint}
            </p>
          </CardBody>
        ) : (
          <CardBody className="text-center text-xs text-text-muted">
            Höchster Tier erreicht — danke für die Treue 💛
          </CardBody>
        )}
      </Card>

      {cadence ? (
        <Card
          className={
            cadence.overdue && !cadence.stale && upcoming.length === 0
              ? 'mb-4 border-l-4 border-l-warning bg-warning/5'
              : 'mb-4'
          }
          elevation="flat"
        >
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                Besuchs-Rhythmus
              </p>
              <p className="mt-1 text-sm text-text-primary">
                Kommt ca. alle{' '}
                <span className="font-semibold">
                  {cadence.avgDays < 14
                    ? tag(cadence.avgDays)
                    : woche(Math.round(cadence.avgDays / 7))}
                </span>
              </p>
            </div>
            <div className="text-right">
              {upcoming.length > 0 ? (
                <span className="inline-flex items-center rounded-md border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  Nächster Termin gebucht
                </span>
              ) : cadence.stale ? (
                <span className="inline-flex items-center rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-muted">
                  Lange nicht gesehen
                </span>
              ) : cadence.diffDays === 0 ? (
                <span className="inline-flex items-center rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                  Heute fällig
                </span>
              ) : cadence.overdue ? (
                <span className="inline-flex items-center rounded-md border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                  ⚠ Überfällig seit {tag(Math.abs(cadence.diffDays))}
                </span>
              ) : cadence.diffDays <= 14 ? (
                <span className="inline-flex items-center rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                  Fällig in {tag(cadence.diffDays)}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary">
                  Nächster Besuch ca. in {woche(Math.round(cadence.diffDays / 7))}
                </span>
              )}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* Loyalty-Stempelkarte. Nur sichtbar wenn Programm aktiv UND Balance-
          Daten geladen (= keine API-Fehler). Sonst Komponente weglassen statt
          leeres Skelett zu zeigen. */}
      {loyaltyData.program && loyaltyData.program.active && loyaltyData.balance ? (
        <LoyaltyCard
          clientId={id}
          clientFirstName={client.firstName}
          program={{
            name: loyaltyData.program.name,
            redeemThreshold: loyaltyData.program.redeemThreshold,
            rewardLabel: loyaltyData.program.rewardLabel,
          }}
          balance={loyaltyData.balance}
          stamps={loyaltyData.stamps}
        />
      ) : null}

      {topServices.length > 0 ? (
        <Card className="mb-8">
          <CardBody>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Am häufigsten gebucht
            </p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Am häufigsten gebuchte Services">
              {topServices.map((svc) => (
                <li
                  key={svc.serviceId}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
                >
                  <span className="font-medium text-text-primary">{svc.name}</span>
                  <span className="text-xs tabular-nums text-text-muted">{svc.count}×</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {upcoming.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Bevorstehende Termine
          </h2>
          <Card>
            <CardBody className="p-0">
              <ul className="divide-y divide-border">
                {upcoming.map((a) => (
                  <ApptRow key={a.id} a={a} clientId={client.id} />
                ))}
              </ul>
            </CardBody>
          </Card>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          Verlauf
        </h2>
        {past.length === 0 ? (
          <Card>
            <CardBody className="py-10 text-center text-sm text-text-muted">
              Noch keine vergangenen Termine.
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="p-0">
              <ul className="divide-y divide-border">
                {past.map((a) => (
                  <ApptRow key={a.id} a={a} clientId={client.id} showRebook />
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </section>

      {client.notesInternal ? (
        <Card className="mt-8 border-l-4 border-l-warning bg-warning/5">
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wider text-warning">
              Interne Notiz
            </p>
            <p className="mt-2 whitespace-pre-line text-sm text-text-primary">
              {client.notesInternal}
            </p>
          </CardBody>
        </Card>
      ) : null}

      <section className="mt-10 rounded-lg border border-border bg-surface/50 p-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          DSGVO · Datenschutz
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Kundin fragt nach ihren Daten oder möchte gelöscht werden? Ein Klick. Export enthält
          Profil + alle Termine, Löschung markiert zur 30-Tage-Entfernung.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`/api/clients/${client.id}/export`}
            download={`client-${client.id}-export.json`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-primary transition-colors hover:bg-surface-raised"
          >
            ↓ Daten exportieren (JSON)
          </a>
          <form action={forgetClient.bind(null, client.id)}>
            <Button type="submit" variant="danger">
              Kundin löschen (DSGVO)
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}

function ApptRow({
  a,
  clientId,
  showRebook,
}: {
  a: Appt;
  clientId: string;
  showRebook?: boolean;
}): React.JSX.Element {
  const service = a.items.map((i) => i.service.name).join(', ') || '—';
  const staff = `${a.staff.firstName} ${a.staff.lastName[0]}.`;
  const primaryServiceId = a.items[0]?.serviceId;
  const rebookHref = primaryServiceId
    ? `/calendar/new?clientId=${clientId}&serviceId=${primaryServiceId}&staffId=${a.staffId}`
    : `/calendar/new?clientId=${clientId}&staffId=${a.staffId}`;

  return (
    <li className="flex items-center gap-4 px-5 py-3 text-sm">
      <div className="w-32 tabular-nums text-text-secondary">
        {new Date(a.startAt).toLocaleDateString('de-CH', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
        <span className="ml-2 text-xs text-text-muted">
          {new Date(a.startAt).toLocaleTimeString('de-CH', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <div className="flex-1">
        <Link href={`/calendar/${a.id}`} className="block hover:underline">
          <div className="font-medium text-text-primary">{service}</div>
          <div className="text-xs text-text-muted">{staff}</div>
        </Link>
      </div>
      <Badge tone={statusTone[a.status] ?? 'neutral'}>{statusLabel[a.status] ?? a.status}</Badge>
      {showRebook && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW' ? (
        <Link
          href={rebookHref}
          className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
          title="Gleichen Service erneut buchen"
        >
          ↻ Rebook
        </Link>
      ) : null}
    </li>
  );
}
