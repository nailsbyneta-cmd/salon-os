import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Badge, Card, CardBody, PriceDisplay } from '@salon-os/ui';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface Location {
  id: string;
  name: string;
  city: string | null;
  address1: string | null;
  address2: string | null;
  postalCode: string | null;
  countryCode: string;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  openingHours: unknown;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  basePrice: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
}

interface StaffPublic {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  bio: string | null;
  photoUrl: string | null;
  color: string | null;
}

interface TenantInfo {
  slug: string;
  name: string;
  countryCode: string;
  timezone: string;
  currency: string;
}

interface OpeningHoursEntry {
  open?: string;
  close?: string;
  closed?: boolean;
}

const WEEKDAYS: Array<{ key: string; label: string }> = [
  { key: 'mon', label: 'Montag' },
  { key: 'tue', label: 'Dienstag' },
  { key: 'wed', label: 'Mittwoch' },
  { key: 'thu', label: 'Donnerstag' },
  { key: 'fri', label: 'Freitag' },
  { key: 'sat', label: 'Samstag' },
  { key: 'sun', label: 'Sonntag' },
];

async function loadTenantData(slug: string): Promise<{
  tenant: TenantInfo;
  locations: Location[];
  services: Service[];
  categories: Category[];
  staff: StaffPublic[];
} | null> {
  try {
    const [infoRes, svcRes, catRes] = await Promise.all([
      fetch(`${API_URL}/v1/public/${slug}/info`, { cache: 'no-store' }),
      fetch(`${API_URL}/v1/public/${slug}/services`, { cache: 'no-store' }),
      fetch(`${API_URL}/v1/public/${slug}/service-categories`, {
        cache: 'no-store',
      }).catch(() => null),
    ]);
    if (!infoRes.ok || !svcRes.ok) return null;
    const info = (await infoRes.json()) as {
      tenant: TenantInfo;
      locations: Location[];
      staff: StaffPublic[];
    };
    const svcData = (await svcRes.json()) as { services: Service[] };
    const catData =
      catRes && catRes.ok
        ? ((await catRes.json()) as { categories: Category[] })
        : { categories: [] };
    return {
      tenant: info.tenant,
      locations: info.locations,
      services: svcData.services,
      categories: catData.categories,
      staff: info.staff,
    };
  } catch {
    return null;
  }
}

function formatAddress(loc: Location): string {
  const parts = [
    loc.address1,
    loc.address2,
    [loc.postalCode, loc.city].filter(Boolean).join(' '),
  ].filter(Boolean);
  return parts.join(', ');
}

function mapLink(loc: Location): string | null {
  if (loc.latitude != null && loc.longitude != null) {
    return `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;
  }
  const addr = formatAddress(loc);
  if (!addr) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(addr)}`;
}

function todayWeekdayKey(): string {
  const d = new Date();
  const idx = (d.getDay() + 6) % 7; // 0 = Mo
  return WEEKDAYS[idx]!.key;
}

function openingHoursArray(
  raw: unknown,
): Array<{ key: string; label: string; text: string; isToday: boolean }> {
  const hours = (raw ?? {}) as Record<string, OpeningHoursEntry>;
  const todayKey = todayWeekdayKey();
  return WEEKDAYS.map(({ key, label }) => {
    const e = hours[key];
    const closed = !e || e.closed || !e.open || !e.close;
    return {
      key,
      label,
      text: closed ? 'geschlossen' : `${e!.open}–${e!.close}`,
      isToday: key === todayKey,
    };
  });
}

export default async function BookingStart({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const data = await loadTenantData(slug);
  if (!data) notFound();
  const { tenant, locations, services, categories, staff } = data;

  const catById = new Map(categories.map((c) => [c.id, c.name]));
  const byCategory = new Map<string, Service[]>();
  for (const s of services) {
    const key = catById.get(s.categoryId) ?? 'Services';
    const bucket = byCategory.get(key) ?? [];
    bucket.push(s);
    byCategory.set(key, bucket);
  }

  const primaryLocation = locations[0] ?? null;
  const hours = primaryLocation
    ? openingHoursArray(primaryLocation.openingHours)
    : [];

  return (
    <main className="space-y-10">
      {/* Hero */}
      <header className="rounded-2xl bg-gradient-to-br from-accent/10 via-brand/5 to-transparent px-6 py-10 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Online buchen
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          {tenant.name}
        </h1>
        {primaryLocation ? (
          <p className="mt-2 text-sm text-text-secondary">
            {primaryLocation.name}
            {primaryLocation.city ? ` · ${primaryLocation.city}` : ''}
          </p>
        ) : null}
        <p className="mt-4 text-xs text-text-muted">
          Wähle deine Behandlung, Datum &amp; Uhrzeit — alles in unter 60 Sek.
        </p>
      </header>

      {locations.length > 1 ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Standort wählen
          </h2>
          <div className="grid gap-2">
            {locations.map((loc) => (
              <Link key={loc.id} href={`/book/${slug}/${loc.id}`}>
                <Card elevation="hoverable">
                  <CardBody>
                    <div className="font-medium text-text-primary">
                      {loc.name}
                    </div>
                    {loc.city ? (
                      <div className="mt-0.5 text-sm text-text-muted">
                        {loc.city}
                      </div>
                    ) : null}
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Services */}
      {Array.from(byCategory.entries()).map(([catName, items]) => (
        <section key={catName}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            {catName}
          </h2>
          <div className="grid gap-2">
            {items.map((s) => (
              <Link
                key={s.id}
                href={`/book/${slug}/service/${s.id}?location=${locations[0]?.id ?? ''}`}
                className="group"
              >
                <Card elevation="hoverable">
                  <CardBody className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-text-primary">
                        {s.name}
                      </div>
                      {s.description ? (
                        <div className="mt-0.5 text-sm text-text-secondary">
                          {s.description}
                        </div>
                      ) : null}
                      <div className="mt-1.5 text-xs text-text-muted">
                        {s.durationMinutes} Min
                      </div>
                    </div>
                    <PriceDisplay amount={s.basePrice} size="lg" />
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* Team */}
      {staff.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Unser Team
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {staff.map((s) => (
              <Card key={s.id} elevation="flat">
                <CardBody className="flex items-start gap-3 py-4">
                  <Avatar
                    name={`${s.firstName} ${s.lastName}`}
                    color={s.color ?? 'hsl(var(--brand-accent))'}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-text-primary">
                      {s.displayName ?? `${s.firstName} ${s.lastName}`}
                    </div>
                    {s.bio ? (
                      <p className="mt-1 text-xs text-text-secondary line-clamp-3">
                        {s.bio}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-text-muted italic">
                        Freut sich auf dich.
                      </p>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* Standort + Öffnungszeiten + Kontakt */}
      {primaryLocation ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Salon &amp; Kontakt
          </h2>
          <Card>
            <CardBody className="space-y-5">
              <div>
                <div className="text-sm font-medium text-text-primary">
                  {primaryLocation.name}
                </div>
                {formatAddress(primaryLocation) ? (
                  <div className="mt-0.5 text-sm text-text-secondary">
                    {formatAddress(primaryLocation)}
                  </div>
                ) : null}
                {mapLink(primaryLocation) ? (
                  <a
                    href={mapLink(primaryLocation)!}
                    target="_blank"
                    rel="noopener"
                    className="mt-1.5 inline-block text-xs font-medium text-accent hover:underline"
                  >
                    Route in Google Maps →
                  </a>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {primaryLocation.phone ? (
                  <a
                    href={`tel:${primaryLocation.phone}`}
                    className="rounded-md border border-border bg-surface px-3 py-2.5 text-sm transition-colors hover:bg-surface-raised"
                  >
                    <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                      Anrufen
                    </div>
                    <div className="mt-0.5 font-medium text-text-primary">
                      {primaryLocation.phone}
                    </div>
                  </a>
                ) : null}
                {primaryLocation.email ? (
                  <a
                    href={`mailto:${primaryLocation.email}`}
                    className="rounded-md border border-border bg-surface px-3 py-2.5 text-sm transition-colors hover:bg-surface-raised"
                  >
                    <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                      E-Mail
                    </div>
                    <div className="mt-0.5 truncate font-medium text-text-primary">
                      {primaryLocation.email}
                    </div>
                  </a>
                ) : null}
              </div>

              {hours.length > 0 ? (
                <div>
                  <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
                    Öffnungszeiten
                  </div>
                  <ul className="space-y-1 text-sm">
                    {hours.map((h) => (
                      <li
                        key={h.key}
                        className={`flex justify-between tabular-nums ${
                          h.isToday ? 'font-semibold text-text-primary' : 'text-text-secondary'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {h.label}
                          {h.isToday ? (
                            <Badge tone="accent">Heute</Badge>
                          ) : null}
                        </span>
                        <span>{h.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </section>
      ) : null}

      <footer className="border-t border-border pt-6 text-center text-[11px] tracking-wider text-text-muted">
        <div>
          Powered by <span className="font-semibold">SALON OS</span>
        </div>
      </footer>
    </main>
  );
}
