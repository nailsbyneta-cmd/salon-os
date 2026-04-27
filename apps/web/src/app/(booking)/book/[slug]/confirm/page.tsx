import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Avatar, Button, Card, CardBody, Field, Input, PriceDisplay, Textarea } from '@salon-os/ui';
import { BookingSteps } from '../booking-steps';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  basePrice: string;
}

interface StaffPublic {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  color: string | null;
}

interface ServiceDetail {
  service: Service;
  optionGroups: Array<{
    id: string;
    name: string;
    options: Array<{ id: string; label: string }>;
  }>;
  addOns: Array<{ id: string; name: string }>;
  bundles: Array<{ id: string; label: string; bundledService: { name: string } }>;
}

async function loadContext(
  slug: string,
  serviceId: string,
  staffId: string,
): Promise<{
  service: Service | null;
  staff: StaffPublic | null;
  detail: ServiceDetail | null;
}> {
  try {
    const [svcRes, infoRes, detailRes] = await Promise.all([
      fetch(`${API_URL}/v1/public/${slug}/services`, { cache: 'no-store' }),
      fetch(`${API_URL}/v1/public/${slug}/info`, { cache: 'no-store' }),
      fetch(`${API_URL}/v1/public/${slug}/services/${serviceId}`, { cache: 'no-store' }),
    ]);
    const services: Service[] = svcRes.ok
      ? ((await svcRes.json()) as { services: Service[] }).services
      : [];
    const info = infoRes.ok ? ((await infoRes.json()) as { staff: StaffPublic[] }) : { staff: [] };
    const detail: ServiceDetail | null = detailRes.ok
      ? ((await detailRes.json()) as ServiceDetail)
      : null;
    return {
      service: services.find((s) => s.id === serviceId) ?? null,
      staff: info.staff.find((s) => s.id === staffId) ?? null,
      detail,
    };
  } catch {
    return { service: null, staff: null, detail: null };
  }
}

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
      const body = (await res.json().catch(() => ({}))) as {
        title?: string;
        detail?: string;
      };
      // Conflict (409) hat genaue detail-Message; 500er sind generische
      // 'Internal Server Error' — ersetze die durch user-freundliche Variante.
      if (res.status === 500) {
        return {
          ok: false,
          error: 'Etwas ist schief gelaufen — bitte versuche es nochmal in einem Moment.',
        };
      }
      return { ok: false, error: body.detail ?? body.title ?? 'Unbekannter Fehler' };
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
    price?: string;
    duration?: string;
    options?: string;
    addons?: string;
    bundles?: string;
  }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const sp = await searchParams;
  if (!sp.serviceId || !sp.locationId || !sp.staffId || !sp.startAt) {
    redirect(`/book/${slug}`);
  }

  const configuredPrice = sp.price ? Number(sp.price) : null;
  const configuredDuration = sp.duration ? Number(sp.duration) : null;

  const { service, staff, detail } = await loadContext(slug, sp.serviceId, sp.staffId);

  // Resolve IDs → Labels via detail
  const selectedOptionLabels: string[] = [];
  if (sp.options && detail) {
    const optionIds = sp.options.split(',');
    for (const g of detail.optionGroups) {
      for (const o of g.options) {
        if (optionIds.includes(o.id)) selectedOptionLabels.push(o.label);
      }
    }
  }
  const selectedAddOnNames: string[] = [];
  if (sp.addons && detail) {
    const ids = sp.addons.split(',');
    for (const a of detail.addOns) {
      if (ids.includes(a.id)) selectedAddOnNames.push(a.name);
    }
  }
  const selectedBundleNames: string[] = [];
  if (sp.bundles && detail) {
    const ids = sp.bundles.split(',');
    for (const b of detail.bundles) {
      if (ids.includes(b.id)) selectedBundleNames.push(b.bundledService.name);
    }
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

  const start = new Date(sp.startAt);
  const staffName = staff ? (staff.displayName ?? `${staff.firstName} ${staff.lastName}`) : null;

  return (
    <main className="space-y-6">
      <BookingSteps current="confirm" />

      <Link
        href={`/book/${slug}`}
        className="inline-flex text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        ← Zurück
      </Link>

      <header>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">Bestätigen</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text-primary">
          Fast geschafft
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Prüfe deine Auswahl, dann trage deine Daten ein.
        </p>
      </header>

      {/* Summary */}
      <Card elevation="flat" className="bg-accent/5">
        <CardBody className="space-y-4">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Termin
            </div>
            <div className="mt-1 font-display text-xl font-semibold text-text-primary">
              {start.toLocaleDateString('de-CH', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
              })}{' '}
              ·{' '}
              {start.toLocaleTimeString('de-CH', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          {service ? (
            <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
              <div className="min-w-0">
                <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Leistung
                </div>
                <div className="mt-0.5 font-medium text-text-primary">{service.name}</div>
                {selectedOptionLabels.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1 text-xs text-text-secondary">
                    {selectedOptionLabels.map((l, i) => (
                      <span
                        key={i}
                        className="rounded-sm bg-accent/10 px-1.5 py-0.5 text-[11px] text-accent"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                ) : null}
                {selectedAddOnNames.length > 0 ? (
                  <div className="mt-1 text-xs text-text-secondary">
                    + {selectedAddOnNames.join(', ')}
                  </div>
                ) : null}
                <div className="mt-1 text-xs text-text-muted">
                  {configuredDuration ?? service.durationMinutes} Min
                </div>
              </div>
              <PriceDisplay
                amount={String(configuredPrice ?? Number(service.basePrice))}
                size="lg"
              />
            </div>
          ) : null}

          {selectedBundleNames.length > 0 ? (
            <div className="border-t border-border pt-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-accent">
                + Kombi
              </div>
              <div className="mt-0.5 font-medium text-text-primary">
                {selectedBundleNames.join(', ')}
              </div>
              <div className="mt-0.5 text-xs text-success">Rabatt bereits im Preis</div>
            </div>
          ) : null}

          {staff && staffName ? (
            <div className="flex items-center gap-3 border-t border-border pt-3">
              <Avatar
                name={staffName}
                color={staff.color ?? 'hsl(var(--brand-accent))'}
                size="sm"
              />
              <div className="min-w-0">
                <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Bei
                </div>
                <div className="mt-0.5 font-medium text-text-primary">{staffName}</div>
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

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
              Termin verbindlich buchen
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
