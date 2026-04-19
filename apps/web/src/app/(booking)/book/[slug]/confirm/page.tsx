import { redirect } from 'next/navigation';

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
    return { ok: false, error: err instanceof Error ? err.message : 'Netzwerk-Fehler' };
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
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
          Bestätigen
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {new Date(sp.startAt!).toLocaleString('de-CH', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </h1>
      </header>

      <form action={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Vorname
            </span>
            <input
              required
              name="firstName"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Nachname
            </span>
            <input
              required
              name="lastName"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            E-Mail
          </span>
          <input
            required
            type="email"
            name="email"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Telefon (optional)
          </span>
          <input
            type="tel"
            name="phone"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Bemerkung (optional)
          </span>
          <textarea
            name="notes"
            rows={3}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
        >
          Termin verbindlich buchen
        </button>
        <p className="text-center text-[11px] text-neutral-400">
          Mit der Buchung stimmst Du unseren AGB und der Datenschutzerklärung zu.
        </p>
      </form>
    </main>
  );
}
