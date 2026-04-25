import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Badge, Button, Card, CardBody } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { SuggestionCard } from './suggestion-card';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  phoneE164?: string | null;
  birthday: string | null;
  notesInternal: string | null;
  tags: string[];
  totalVisits: number;
  lifetimeValue?: string | number | null;
  totalSpent?: string | number | null;
  lastVisitAt: string | null;
  noShowRisk: string | null;
  blocked: boolean;
}

interface Appt {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  staffId?: string;
  staff: { firstName: string; lastName: string };
  items: Array<{ serviceId?: string; service: { name: string } }>;
  seriesId?: string | null;
}

interface Series {
  id: string;
  intervalWeeks: number;
  firstStartAt: string;
  occurrences: number | null;
  endsAt: string | null;
  service: { name: string };
  staff: { firstName: string; lastName: string };
}

async function loadSeries(clientId: string): Promise<Series[]> {
  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<{ series: Series[] }>(
      `/v1/appointment-series?clientId=${clientId}`,
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
    return res.series;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

interface SuggestedPattern {
  serviceId: string;
  staffId: string;
  intervalWeeks: number;
  weekday: number;
  hourOfDay: number;
  minuteOfHour: number;
  durationMinutes: number;
  matchCount: number;
  confidence: number;
  nextSuggestedAt: string;
  service: { name: string };
  staff: { firstName: string; lastName: string };
}

async function loadSuggestion(clientId: string): Promise<SuggestedPattern | null> {
  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<{ pattern: SuggestedPattern | null }>(
      `/v1/appointment-series/suggest?clientId=${clientId}`,
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
    return res.pattern;
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

async function loadClient(id: string): Promise<Client | null> {
  const ctx = getCurrentTenant();
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

async function loadAppointments(clientId: string): Promise<Appt[]> {
  const ctx = getCurrentTenant();
  // Past 6 months + next 3 months
  const from = new Date();
  from.setMonth(from.getMonth() - 6);
  const to = new Date();
  to.setMonth(to.getMonth() + 3);
  try {
    const res = await apiFetch<{ appointments: Appt[] }>(
      `/v1/appointments?clientId=${clientId}&from=${from.toISOString()}&to=${to.toISOString()}`,
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
    return res.appointments;
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
  };

/**
 * Mobile-Kunden-Detail — Single-Thumb-Layout. Oben Avatar + Stats,
 * Contact-Shortcuts, dann Termine (upcoming + history).
 */
export default async function MobileClientDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const [client, appointments, series, suggestion] = await Promise.all([
    loadClient(id),
    loadAppointments(id),
    loadSeries(id),
    loadSuggestion(id),
  ]);
  if (!client) notFound();

  // Last completed appointment für Quick-Rebook-CTA
  const lastCompleted = appointments
    .filter((a) => a.status === 'COMPLETED')
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())[0];
  const quickRebookUrl = lastCompleted
    ? (() => {
        // Default: gleicher Wochentag, 4 Wochen nach letztem Termin
        const last = new Date(lastCompleted.startAt);
        const next = new Date(last);
        next.setDate(next.getDate() + 28);
        const d = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(
          next.getDate(),
        ).padStart(2, '0')}`;
        const t = `${String(last.getHours()).padStart(2, '0')}:${String(last.getMinutes()).padStart(
          2,
          '0',
        )}`;
        const params = new URLSearchParams({
          clientId: client.id,
          date: d,
          time: t,
        });
        if (lastCompleted.staffId) params.set('staffId', lastCompleted.staffId);
        const sid = lastCompleted.items[0]?.serviceId;
        if (sid) params.set('serviceId', sid);
        return `/calendar/new?${params.toString()}`;
      })()
    : null;

  const fullName = `${client.firstName} ${client.lastName}`;
  const lifetime = Number(client.lifetimeValue ?? client.totalSpent ?? 0) || 0;
  const isVip = lifetime >= 2000;
  const risk = client.noShowRisk != null ? Math.round(Number(client.noShowRisk)) : null;
  const telHref = client.phoneE164 ?? client.phone ?? null;
  const waDigits = client.phoneE164
    ? client.phoneE164.replace(/^\+/, '')
    : client.phone
      ? client.phone.replace(/[^+\d]/g, '').replace(/^\+/, '')
      : null;
  const hasPhone = telHref && waDigits && waDigits.length >= 7;

  const now = new Date();
  const upcoming = appointments
    .filter((a) => new Date(a.startAt) >= now && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW')
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const history = appointments
    .filter((a) => new Date(a.startAt) < now || a.status === 'COMPLETED')
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
    .slice(0, 10);

  return (
    <div className="pb-20">
      <header className="px-5 pt-8 pb-5">
        <Link
          href="/m/clients"
          className="inline-flex text-xs text-text-muted transition-colors hover:text-text-primary"
        >
          ← Kundinnen
        </Link>
        <div className="mt-4 flex items-start gap-3">
          <Avatar name={fullName} color="hsl(var(--brand-accent))" size="lg" vip={isVip} />
          <div className="min-w-0 flex-1">
            {client.blocked ? (
              <Badge tone="danger" dot>
                Blockiert
              </Badge>
            ) : null}
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-text-primary">
              {fullName}
            </h1>
            <p className="mt-0.5 truncate text-sm text-text-secondary">
              {client.phone ?? client.email ?? '—'}
            </p>
            {client.tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {client.tags.map((t) => (
                  <Badge key={t} tone="neutral">
                    {t}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="mx-5 mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-md border border-border bg-surface p-3 text-center">
          <div className="text-[9px] font-medium uppercase tracking-wider text-text-muted">
            Besuche
          </div>
          <div className="mt-1 font-display text-xl font-semibold tabular-nums">
            {client.totalVisits}
          </div>
        </div>
        <div className="rounded-md border border-border bg-surface p-3 text-center">
          <div className="text-[9px] font-medium uppercase tracking-wider text-text-muted">
            Umsatz
          </div>
          <div className="mt-1 font-display text-xl font-semibold tabular-nums text-accent">
            {lifetime.toFixed(0)}
          </div>
          <div className="text-[9px] text-text-muted">CHF</div>
        </div>
        <div className="rounded-md border border-border bg-surface p-3 text-center">
          <div className="text-[9px] font-medium uppercase tracking-wider text-text-muted">
            No-Show
          </div>
          <div
            className={[
              'mt-1 font-display text-xl font-semibold tabular-nums',
              risk != null && risk >= 40
                ? 'text-danger'
                : risk != null && risk >= 25
                  ? 'text-warning'
                  : 'text-text-primary',
            ].join(' ')}
          >
            {risk != null ? `${risk}%` : '—'}
          </div>
        </div>
      </section>

      {/* Contact-Shortcuts */}
      {hasPhone || client.email ? (
        <section className="mx-5 mb-4 grid grid-cols-2 gap-2">
          {hasPhone ? (
            <>
              <a
                href={`tel:${telHref}`}
                className="flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-sm active:scale-[0.98] active:translate-y-0"
              >
                📞 Anrufen
              </a>
              <a
                href={`https://wa.me/${waDigits}`}
                target="_blank"
                rel="noopener"
                className="flex h-12 items-center justify-center gap-2 rounded-lg border border-success/30 bg-success/10 text-sm font-medium text-success transition-all duration-200 hover:-translate-y-0.5 hover:border-success/50 hover:shadow-sm active:scale-[0.98] active:translate-y-0"
              >
                💬 WhatsApp
              </a>
            </>
          ) : null}
        </section>
      ) : null}

      {/* Quick-Rebook CTA: nur wenn letzter Termin abgeschlossen */}
      {quickRebookUrl && lastCompleted ? (
        <section className="mx-5 mb-4">
          <Link
            href={quickRebookUrl}
            className="flex items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:bg-accent/10 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span aria-hidden className="text-2xl">
                ↻
              </span>
              <div>
                <div className="font-medium text-text-primary">Wie letztes Mal buchen</div>
                <div className="text-xs text-text-muted">
                  {lastCompleted.items.map((i) => i.service.name).join(', ')} · vor{' '}
                  {Math.floor(
                    (Date.now() - new Date(lastCompleted.startAt).getTime()) /
                      (1000 * 60 * 60 * 24),
                  )}{' '}
                  Tagen
                </div>
              </div>
            </div>
            <span className="text-accent">→</span>
          </Link>
        </section>
      ) : null}

      <div className="space-y-4 px-5">
        {/* AI-Pattern-Suggestion */}
        {suggestion ? <SuggestionCard clientId={client.id} pattern={suggestion} /> : null}

        {/* Notizen */}
        {client.notesInternal ? (
          <Card>
            <CardBody>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warning">
                Interne Notiz
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-text-primary">
                {client.notesInternal}
              </p>
            </CardBody>
          </Card>
        ) : null}

        {/* Recurring-Serien */}
        {series.length > 0 ? (
          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              🔁 Wiederkehrende Termine
            </p>
            <ul className="space-y-2">
              {series.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm"
                >
                  <div className="font-medium text-text-primary">{s.service.name}</div>
                  <div className="mt-0.5 text-xs text-text-muted">
                    Alle {s.intervalWeeks} Wochen · bei {s.staff.firstName}
                    {s.occurrences ? ` · ${s.occurrences}× total` : ' · unbegrenzt'}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Upcoming */}
        {upcoming.length > 0 ? (
          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Nächste Termine
            </p>
            <ul className="space-y-2">
              {upcoming.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/m/calendar/${a.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
                  >
                    <div className="w-14 shrink-0 text-center">
                      <div className="font-display text-sm font-semibold tabular-nums text-text-primary">
                        {new Date(a.startAt).toLocaleDateString('de-CH', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </div>
                      <div className="text-[10px] tabular-nums text-text-muted">
                        {new Date(a.startAt).toLocaleTimeString('de-CH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text-primary">
                        {a.items.map((i) => i.service.name).join(', ')}
                      </div>
                      <div className="truncate text-xs text-text-muted">
                        bei {a.staff.firstName}
                      </div>
                    </div>
                    <Badge tone={statusTone[a.status] ?? 'neutral'} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* History */}
        {history.length > 0 ? (
          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
              Historie (10 letzte)
            </p>
            <ul className="space-y-1">
              {history.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                >
                  <span className="w-20 shrink-0 tabular-nums text-text-muted">
                    {new Date(a.startAt).toLocaleDateString('de-CH', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    })}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-text-primary">
                    {a.items.map((i) => i.service.name).join(', ')}
                  </span>
                  <Badge tone={statusTone[a.status] ?? 'neutral'} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="flex justify-center pt-2">
          <Link href={`/clients/${client.id}`}>
            <Button variant="ghost" size="sm">
              ⚙ Vollständig bearbeiten
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
