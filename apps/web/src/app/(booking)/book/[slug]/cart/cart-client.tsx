'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, CardBody, Input, cn } from '@salon-os/ui';
import { useCart } from '../cart-store';
import { searchMultiSlots, type MultiSlotsResult } from './actions';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-CH', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

export function CartClient({
  slug,
  locationId,
}: {
  slug: string;
  locationId: string | null;
}): React.JSX.Element {
  const { items, remove, clear } = useCart(slug);
  const [date, setDate] = React.useState(todayIso());
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<MultiSlotsResult | null>(null);
  const router = useRouter();

  const totalCents = items.reduce((s, i) => s + i.priceMinor, 0);
  const totalMin = items.reduce((s, i) => s + i.durationMinutes, 0);

  const search = React.useCallback(async (): Promise<void> => {
    if (!locationId || items.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const result = await searchMultiSlots(slug, {
        date,
        locationId,
        items: items.map((i) => ({
          serviceId: i.serviceId,
          durationMinutes: i.durationMinutes,
        })),
      });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      // Defensive: filter degenerate options ohne Stops weg — sonst crash beim Rendering
      setResults({
        ...result,
        options: result.options.filter((o) => o.stops.length === items.length),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Netzwerk-Fehler');
    } finally {
      setLoading(false);
    }
  }, [slug, locationId, items, date]);

  // Auto-search beim ersten Laden + bei Änderungen
  React.useEffect(() => {
    if (items.length >= 2 && locationId) {
      void search();
    }
  }, [items.length, locationId, date, search]);

  if (items.length === 0) {
    return (
      <Card>
        <CardBody className="space-y-3 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-3xl">
            🛒
          </div>
          <p className="font-display text-lg font-semibold">Cart leer</p>
          <p className="text-sm text-text-secondary">
            Wähle zwei oder mehr Services auf der Übersichts-Seite.
          </p>
          <Link href={`/book/${slug}`}>
            <Button variant="accent">Zur Service-Auswahl</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  if (items.length < 2) {
    return (
      <Card>
        <CardBody className="space-y-3 py-8 text-center">
          <p className="text-sm text-text-secondary">
            Multi-Service-Buchung braucht mindestens 2 Services. Mit nur einem geht's einfacher
            direkt zum Single-Service-Flow.
          </p>
          <Link href={`/book/${slug}/service/${items[0]!.serviceId}/configure`}>
            <Button variant="accent">{items[0]!.serviceName} jetzt buchen</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cart-Liste */}
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              {items.length} Services
            </p>
            <button
              type="button"
              onClick={clear}
              className="text-xs text-text-muted hover:text-danger hover:underline"
            >
              Cart leeren
            </button>
          </div>
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li
                key={i.serviceId}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-text-primary">{i.serviceName}</div>
                  <div className="text-xs text-text-muted">{i.durationMinutes} Min</div>
                </div>
                <div className="font-display text-base font-semibold tabular-nums">
                  CHF {(i.priceMinor / 100).toFixed(0)}
                </div>
                <button
                  type="button"
                  onClick={() => remove(i.serviceId)}
                  className="text-text-muted hover:text-danger"
                  aria-label={`${i.serviceName} entfernen`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
              Total
            </span>
            <div className="text-right">
              <div className="font-display text-2xl font-semibold tabular-nums">
                CHF {(totalCents / 100).toFixed(0)}
              </div>
              <div className="text-xs tabular-nums text-text-muted">
                ca. {totalMin} Min Gesamtdauer
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Datum-Picker */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-3">
          <label htmlFor="cart-date" className="text-sm font-medium text-text-primary">
            Wunsch-Datum
          </label>
          <Input
            id="cart-date"
            type="date"
            value={date}
            min={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
          <Button type="button" variant="primary" onClick={() => void search()} disabled={loading}>
            {loading ? 'Suche…' : 'Termine suchen'}
          </Button>
        </CardBody>
      </Card>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      ) : null}

      {/* Slot-Optionen */}
      {results && results.options.length === 0 ? (
        <Card elevation="flat" className="bg-accent/5">
          <CardBody className="space-y-2 py-8 text-center">
            <div
              aria-hidden
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-2xl"
            >
              📅
            </div>
            <p className="font-display text-lg font-semibold">Keine Kombination möglich</p>
            <p className="text-sm text-text-secondary">
              An diesem Tag finden wir keine Slot-Kette für deine Services. Probier ein anderes
              Datum.
            </p>
          </CardBody>
        </Card>
      ) : null}

      {results && results.options.length > 0 ? (
        <section>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            {results.options.length} Optionen — sortiert nach Reihenfolge & Wartezeit
          </p>
          <div className="space-y-2">
            {results.options.map((opt, idx) => {
              const startTime = fmtTime(opt.stops[0]!.startAt);
              const endTime = fmtTime(opt.stops[opt.stops.length - 1]!.endAt);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set('locationId', locationId ?? '');
                    params.set(
                      'stops',
                      opt.stops
                        .map((s, i) => `${items[i]!.serviceId}|${s.staffId}|${s.startAt}`)
                        .join(','),
                    );
                    params.set('total', String(totalCents));
                    router.push(`/book/${slug}/cart/confirm?${params.toString()}`);
                  }}
                  className="group block w-full rounded-lg border border-border bg-surface p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-md active:translate-y-0 active:scale-[0.99]"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-semibold tabular-nums text-text-primary group-hover:text-accent">
                        {startTime}–{endTime}
                      </span>
                      {opt.sameStaff ? (
                        <Badge tone="accent">Eine Stylistin</Badge>
                      ) : (
                        <Badge tone="info">
                          {new Set(opt.stops.map((s) => s.staffId)).size}× Wechsel
                        </Badge>
                      )}
                      {opt.gapMinutes > 0 ? (
                        <Badge tone="neutral">{Math.round(opt.gapMinutes)} Min Pause</Badge>
                      ) : null}
                    </div>
                    <div className="text-text-muted group-hover:text-accent">→</div>
                  </div>
                  <ol className="space-y-1 text-xs text-text-secondary">
                    {opt.stops.map((s, i) => (
                      <li key={i} className="flex items-center gap-2 tabular-nums">
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            i === 0 ? 'bg-accent' : 'bg-text-muted',
                          )}
                          aria-hidden
                        />
                        <span className="font-medium">
                          {fmtTime(s.startAt)}–{fmtTime(s.endAt)}
                        </span>
                        <span>·</span>
                        <span>{items[i]!.serviceName}</span>
                        <span>·</span>
                        <span className="text-text-muted">bei {s.staffDisplayName}</span>
                      </li>
                    ))}
                  </ol>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-center text-xs text-text-muted">
            {fmtDate(results.options[0]!.stops[0]!.startAt)}
          </p>
        </section>
      ) : null}
    </div>
  );
}
