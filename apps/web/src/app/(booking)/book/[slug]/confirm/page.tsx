import { redirect } from 'next/navigation';
import { Button, Card, CardBody, Field, Input, Textarea } from '@salon-os/ui';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

async function submitBooking(
  slug: string,
  payload: unknown,
): Promise<{ ok: true; appointmentId: string } | { ok: false; error: string }> {
  'use server';
  try {
    const res = await fetch(`${API_URL}/v1/public/${slug}/bookings`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = (await res.json()) as { title?: string };
      return { ok: false, error: body.title ?? 'Unbekannter Fehler' };
    }
    const data = (await res.json()) as { id: string };
    return { ok: true, appointmentId: data.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Netzwerk-Fehler',
    };
  }
}

export default async function BookingConfirm({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    serviceId?: string;
    locationId?: string;
    staffId?: string;
    startAt?: string;
    error?: string;
  }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const sp = await searchParams;
  if (!sp.serviceId || !sp.locationId || !sp.staffId || !sp.startAt) {
    redirect(`/book/${slug}`);
  }

  async function onSubmit(formData: FormData): Promise<void> {
    'use server';
    const firstName = String(formData.get('firstName') ?? '').trim();
    const lastName = String(formData.get('lastName') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim() || undefined;
    const notes = String(formData.get('notes') ?? '').trim() || undefined;

    const res = await submitBooking(slug, {
      serviceId: sp.serviceId,
      locationId: sp.locationId,
      staffId: sp.staffId,
      startAt: sp.startAt,
      client: { firstName, lastName, email, phone },
      notes,
      language: 'de-CH',
    });

    if (res.ok) {
      redirect(`/book/${slug}/success?id=${res.appointmentId}`);
    } else {
      redirect(
        `/book/${slug}/confirm?${new URLSearchParams({
          serviceId: sp.serviceId!,
          locationId: sp.locationId!,
          staffId: sp.staffId!,
          startAt: sp.startAt!,
          error: res.error,
        })}`,
      );
    }
  }

  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Bestätigen
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text-primary">
          {new Date(sp.startAt!).toLocaleString('de-CH', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </h1>
      </header>

      {sp.error ? (
        <div
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {sp.error}
        </div>
      ) : null}

      <Card>
        <CardBody>
          <form action={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vorname" required>
                <Input required name="firstName" autoComplete="given-name" />
              </Field>
              <Field label="Nachname" required>
                <Input required name="lastName" autoComplete="family-name" />
              </Field>
            </div>
            <Field label="E-Mail" required>
              <Input
                required
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
              />
            </Field>
            <Field label="Telefon (optional)">
              <Input
                type="tel"
                name="phone"
                autoComplete="tel"
                inputMode="tel"
              />
            </Field>
            <Field label="Bemerkung (optional)">
              <Textarea name="notes" rows={3} />
            </Field>
            <Button type="submit" variant="primary" className="w-full">
              Termin verbindlich buchen
            </Button>
            <p className="text-center text-[11px] text-text-muted">
              Mit der Buchung stimmst Du unseren AGB und der Datenschutzerklärung zu.
            </p>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
