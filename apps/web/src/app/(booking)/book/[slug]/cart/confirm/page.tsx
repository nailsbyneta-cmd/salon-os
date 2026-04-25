import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button, Card, CardBody, Field, Input, Textarea } from '@salon-os/ui';
import { BookingSteps } from '../../booking-steps';
import { createBulkBooking } from '../actions';

interface ParsedStop {
  serviceId: string;
  staffId: string;
  startAt: string;
}

function parseStops(raw: string | undefined): ParsedStop[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => part.split('|'))
    .filter((parts) => parts.length === 3)
    .map(([serviceId, staffId, startAt]) => ({
      serviceId: serviceId!,
      staffId: staffId!,
      startAt: startAt!,
    }));
}

export default async function CartConfirm({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locationId?: string; stops?: string; total?: string; error?: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const sp = await searchParams;
  const stops = parseStops(sp.stops);
  if (!sp.locationId || stops.length === 0) {
    redirect(`/book/${slug}/cart`);
  }

  async function onSubmit(formData: FormData): Promise<void> {
    'use server';
    const firstName = String(formData.get('firstName') ?? '').trim();
    const lastName = String(formData.get('lastName') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim() || undefined;
    const notes = String(formData.get('notes') ?? '').trim() || undefined;

    const res = await createBulkBooking(slug, {
      locationId: sp.locationId!,
      stops,
      client: { firstName, lastName, email, phone },
      notes,
    });
    if (res.ok) {
      redirect(
        `/book/${slug}/success?id=${res.appointmentIds[0] ?? ''}&count=${res.appointmentIds.length}`,
      );
    } else {
      redirect(
        `/book/${slug}/cart/confirm?${new URLSearchParams({
          locationId: sp.locationId!,
          stops: sp.stops!,
          total: sp.total ?? '0',
          error: res.error,
        })}`,
      );
    }
  }

  const totalCents = sp.total ? Number(sp.total) : 0;
  const firstStop = new Date(stops[0]!.startAt);
  const dayStr = firstStop.toLocaleDateString('de-CH', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  return (
    <main className="space-y-6">
      <BookingSteps current="confirm" />

      <Link
        href={`/book/${slug}/cart`}
        className="inline-flex text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        ← Zurück zur Auswahl
      </Link>

      <header>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
          Multi-Service · Bestätigen
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Fast geschafft</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {stops.length} Termine am {dayStr} — Gesamt CHF {(totalCents / 100).toFixed(0)}
        </p>
      </header>

      {sp.error ? (
        <div
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {sp.error}
        </div>
      ) : null}

      <Card elevation="flat" className="bg-accent/5">
        <CardBody>
          <ol className="space-y-2 text-sm">
            {stops.map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-3 tabular-nums">
                <span className="font-medium text-text-primary">
                  {new Date(s.startAt).toLocaleTimeString('de-CH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="flex-1 text-text-secondary">Service {i + 1}</span>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <form action={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Vorname" required>
                <Input required name="firstName" autoComplete="given-name" />
              </Field>
              <Field label="Nachname" required>
                <Input required name="lastName" autoComplete="family-name" />
              </Field>
            </div>
            <Field label="E-Mail" required>
              <Input required type="email" name="email" autoComplete="email" inputMode="email" />
            </Field>
            <Field label="Telefon (optional)">
              <Input type="tel" name="phone" autoComplete="tel" inputMode="tel" />
            </Field>
            <Field label="Bemerkung (optional)">
              <Textarea name="notes" rows={3} />
            </Field>
            <Button type="submit" variant="accent" size="lg" className="w-full">
              {stops.length} Termine verbindlich buchen
            </Button>
            <p className="text-center text-[11px] text-text-muted">
              Mit der Buchung stimmst du unseren{' '}
              <Link href={`/book/${slug}/datenschutz`} className="underline hover:text-accent">
                Datenschutz-Bestimmungen
              </Link>{' '}
              und AGB zu.
            </p>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
