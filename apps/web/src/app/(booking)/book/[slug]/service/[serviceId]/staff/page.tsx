import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar } from '@salon-os/ui';
import { BookingSteps } from '../../../booking-steps';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  bio: string | null;
  photoUrl: string | null;
  color: string | null;
}

async function loadStaff(slug: string, serviceId: string, locationId: string): Promise<Staff[]> {
  try {
    const res = await fetch(
      `${API_URL}/v1/public/${slug}/services/${serviceId}/staff?locationId=${encodeURIComponent(locationId)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { staff: Staff[] };
    return data.staff;
  } catch {
    return [];
  }
}

async function loadServiceName(slug: string, serviceId: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/v1/public/${slug}/services/${serviceId}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { service: { name: string } };
    return data.service.name;
  } catch {
    return null;
  }
}

export default async function StaffPickerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; serviceId: string }>;
  searchParams: Promise<{
    location?: string;
    duration?: string;
    price?: string;
    options?: string;
    addons?: string;
    bundles?: string;
  }>;
}): Promise<React.JSX.Element> {
  const { slug, serviceId } = await params;
  const sp = await searchParams;

  if (!sp.location) notFound();

  const [staff, serviceName] = await Promise.all([
    loadStaff(slug, serviceId, sp.location),
    loadServiceName(slug, serviceId),
  ]);

  // Bei nur 1 Mitarbeiterin → direkt überspringen, weiter zu Slots.
  if (staff.length === 1) {
    const params = new URLSearchParams();
    params.set('location', sp.location);
    params.set('staffId', staff[0]!.id);
    if (sp.duration) params.set('duration', sp.duration);
    if (sp.price) params.set('price', sp.price);
    if (sp.options) params.set('options', sp.options);
    if (sp.addons) params.set('addons', sp.addons);
    if (sp.bundles) params.set('bundles', sp.bundles);
    return (
      <main className="space-y-6">
        <BookingSteps current="slot" />
        <p className="text-center text-sm text-text-secondary">Weiterleitung zur Slot-Auswahl…</p>
        <meta httpEquiv="refresh" content={`0;url=/book/${slug}/service/${serviceId}?${params}`} />
      </main>
    );
  }

  // Forward-Params helper — alles ausser staffId/location übernehmen.
  const buildSlotUrl = (staffId: string | null): string => {
    const p = new URLSearchParams();
    p.set('location', sp.location!);
    if (staffId) p.set('staffId', staffId);
    if (sp.duration) p.set('duration', sp.duration);
    if (sp.price) p.set('price', sp.price);
    if (sp.options) p.set('options', sp.options);
    if (sp.addons) p.set('addons', sp.addons);
    if (sp.bundles) p.set('bundles', sp.bundles);
    return `/book/${slug}/service/${serviceId}?${p}`;
  };

  return (
    <main className="space-y-6">
      <BookingSteps current="slot" />

      <Link
        href={`/book/${slug}/service/${serviceId}/configure?location=${sp.location}`}
        className="inline-flex text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        ← Zurück
      </Link>

      <header className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          Wer betreut Dich?
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
          {serviceName ? `${serviceName} bei…` : 'Wähle Deine Stylistin'}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Oder wähle „Egal" — Du bekommst den nächsten freien Termin.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3">
        {/* "Egal"-Karte zuerst — Default-friendly für Kundinnen ohne Präferenz */}
        <Link
          href={buildSlotUrl(null)}
          className="group flex min-h-[80px] items-center gap-4 rounded-xl border-2 border-dashed border-accent/40 bg-accent/5 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:bg-accent/10 hover:shadow-md active:translate-y-0"
        >
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-accent/20 text-2xl">
            ✨
          </div>
          <div className="flex-1">
            <div className="font-display text-lg font-semibold tracking-tight text-text-primary group-hover:text-accent">
              Egal — nächster freier Termin
            </div>
            <p className="mt-0.5 text-sm text-text-secondary">
              Wir suchen Dir den schnellsten Slot
            </p>
          </div>
          <span aria-hidden className="text-xl text-text-muted group-hover:text-accent">
            →
          </span>
        </Link>

        {staff.map((s) => {
          const name = s.displayName ?? `${s.firstName} ${s.lastName}`;
          return (
            <Link
              key={s.id}
              href={buildSlotUrl(s.id)}
              className="group flex min-h-[80px] items-center gap-4 rounded-xl border-2 border-border bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-surface-elevated hover:shadow-md active:translate-y-0"
            >
              <Avatar name={name} color={s.color} size="lg" />
              <div className="flex-1">
                <div className="font-display text-lg font-semibold tracking-tight text-text-primary group-hover:text-accent">
                  {s.firstName}
                </div>
                {s.bio ? (
                  <p className="mt-0.5 line-clamp-2 text-sm text-text-secondary">{s.bio}</p>
                ) : null}
              </div>
              <span aria-hidden className="text-xl text-text-muted group-hover:text-accent">
                →
              </span>
            </Link>
          );
        })}

        {staff.length === 0 ? (
          <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 text-center text-sm text-warning">
            Diese Behandlung ist aktuell keiner Mitarbeiterin zugeordnet — bitte ruf uns an.
          </div>
        ) : null}
      </div>
    </main>
  );
}
