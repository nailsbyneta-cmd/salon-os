import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Badge, Card, CardBody, PriceDisplay } from '@salon-os/ui';
import { CookieConsent } from '@/components/cookie-consent';
import { ServiceCardToggle } from './service-card-toggle';
import { CartPill } from './cart-pill';

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
  order?: number;
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
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  brandColor: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  whatsappE164: string | null;
  googleBusinessUrl: string | null;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface Review {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  sourceUrl: string | null;
  featured: boolean;
  createdAt: string;
}

interface GalleryImage {
  id: string;
  imageUrl: string;
  caption: string | null;
}

type OpeningHoursEntry =
  | { open?: string; close?: string; closed?: boolean }
  | Array<{ open: string; close: string }>;

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
  faqs: FAQ[];
  reviews: Review[];
  gallery: GalleryImage[];
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
      faqs: FAQ[];
      reviews: Review[];
      gallery: GalleryImage[];
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
      faqs: info.faqs,
      reviews: info.reviews,
      gallery: info.gallery,
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

function formatHoursForDay(entry: OpeningHoursEntry | undefined): string {
  if (!entry) return 'geschlossen';
  if (Array.isArray(entry)) {
    if (entry.length === 0) return 'geschlossen';
    return (
      entry
        .filter((i) => i.open && i.close)
        .map((i) => `${i.open}–${i.close}`)
        .join(' & ') || 'geschlossen'
    );
  }
  if (entry.closed || !entry.open || !entry.close) return 'geschlossen';
  return `${entry.open}–${entry.close}`;
}

function openingHoursArray(
  raw: unknown,
): Array<{ key: string; label: string; text: string; isToday: boolean }> | null {
  if (!raw || typeof raw !== 'object') return null;
  const hours = raw as Record<string, OpeningHoursEntry>;
  const hasAnyKey = WEEKDAYS.some(({ key }) => key in hours);
  if (!hasAnyKey) return null;
  const todayKey = todayWeekdayKey();
  return WEEKDAYS.map(({ key, label }) => ({
    key,
    label,
    text: formatHoursForDay(hours[key]),
    isToday: key === todayKey,
  }));
}

function buildTitle(name: string, city: string | null): string {
  // Ziel 50-60 Zeichen
  const base = `${name} — Online Termin buchen`;
  if (city) {
    const withCity = `${name} · Online Termin buchen in ${city}`;
    return withCity.length <= 60 ? withCity : base;
  }
  return base;
}

function buildDescription(
  name: string,
  city: string | null,
  tagline: string | null,
  description: string | null,
  topServices: string[],
): string {
  // Ziel 110-160 Zeichen
  if (tagline && tagline.length >= 110 && tagline.length <= 160) return tagline;
  if (description && description.length >= 110 && description.length <= 160) return description;

  const where = city ? ` in ${city}` : '';
  const teaser = tagline ?? description ?? null;
  const svcList = topServices.length > 0 ? topServices.slice(0, 3).join(', ') : null;

  const parts: string[] = [];
  if (teaser) parts.push(teaser.replace(/\s+/g, ' ').trim());
  if (svcList) {
    parts.push(`Services: ${svcList}.`);
  } else {
    parts.push(`Termin bei ${name}${where} — jetzt online buchen.`);
  }
  parts.push('Bestätigung sofort per E-Mail.');

  let out = parts.join(' ');
  if (out.length > 160) out = out.slice(0, 157).trimEnd() + '…';
  if (out.length < 110) {
    // Auffüllen mit zweiter Fallback-Variante
    out = `${out} Unkompliziert, ohne Anruf, jederzeit stornierbar.`;
    if (out.length > 160) out = out.slice(0, 157).trimEnd() + '…';
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadTenantData(slug);
  if (!data) {
    return {
      title: 'Online Termin buchen',
      description:
        'Termin online buchen — unkompliziert, ohne Anruf, Bestätigung sofort per E-Mail.',
    };
  }
  const { tenant, locations, services } = data;
  const city = locations[0]?.city ?? null;
  const title = buildTitle(tenant.name, city);
  const description = buildDescription(
    tenant.name,
    city,
    tenant.tagline,
    tenant.description,
    services.map((s) => s.name),
  );
  const image = tenant.heroImageUrl ?? tenant.logoUrl ?? undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'de_CH',
      siteName: tenant.name,
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function BookingStart({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const data = await loadTenantData(slug);
  if (!data) notFound();
  const { tenant, locations, services, categories, staff, faqs, reviews, gallery } = data;

  // Phorest-Style Folders: gruppiere Services nach Kategorie + sortiere nach
  // category.order (DB-Reihenfolge). Leere Kategorien werden gar nicht erst
  // gerendert — verhindert "Klick auf Lashes → leer" für Endkundinnen.
  const catById = new Map(categories.map((c) => [c.id, c]));
  const groupedRaw = new Map<string, Service[]>();
  for (const s of services) {
    const bucket = groupedRaw.get(s.categoryId) ?? [];
    bucket.push(s);
    groupedRaw.set(s.categoryId, bucket);
  }
  const grouped = Array.from(groupedRaw.entries())
    .map(([catId, items]) => ({
      catId,
      catName: catById.get(catId)?.name ?? 'Services',
      catOrder: catById.get(catId)?.order ?? 999,
      items,
    }))
    .sort((a, b) => a.catOrder - b.catOrder || a.catName.localeCompare(b.catName));

  const primaryLocation = locations[0] ?? null;
  const hours = primaryLocation ? openingHoursArray(primaryLocation.openingHours) : null;

  return (
    <main className="space-y-10">
      {/* Hero */}
      <header
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/10 via-brand/5 to-transparent px-6 py-10 text-center"
        style={
          tenant.heroImageUrl
            ? {
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.55)), url(${tenant.heroImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: 'white',
              }
            : undefined
        }
      >
        {tenant.logoUrl ? (
          <img
            src={tenant.logoUrl}
            alt={tenant.name}
            className="mx-auto mb-4 h-16 w-16 rounded-full object-cover shadow-lg"
          />
        ) : null}
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
          Online buchen
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          {tenant.name}
        </h1>
        {tenant.tagline ? <p className="mt-3 text-base font-medium">{tenant.tagline}</p> : null}
        {primaryLocation ? (
          <p className="mt-2 text-sm opacity-80">
            {primaryLocation.name}
            {primaryLocation.city ? ` · ${primaryLocation.city}` : ''}
          </p>
        ) : null}
        <p className="mt-4 text-xs opacity-70">
          Wähle deine Behandlung, Datum &amp; Uhrzeit — alles in unter 60 Sek.
        </p>
      </header>

      {/* Trust-Strip — Social Proof direkt unter Hero */}
      {reviews.length > 0 ? (
        <section
          aria-label="Vertrauenssignale"
          className="flex items-center justify-center gap-4 rounded-lg border border-border bg-surface/50 px-4 py-3 text-xs tabular-nums text-text-secondary sm:gap-6 sm:text-sm"
        >
          <div className="flex items-center gap-1.5">
            <span aria-hidden className="text-accent">
              ★
            </span>
            <span className="font-display text-base font-semibold text-text-primary">
              {(reviews.reduce((s, r) => s + r.rating, 0) / Math.max(reviews.length, 1)).toFixed(1)}
            </span>
            <span className="text-[11px] text-text-muted">/ 5</span>
          </div>
          <div className="h-4 w-px bg-border" aria-hidden />
          <div className="flex items-center gap-1">
            <span className="font-display text-base font-semibold text-text-primary">
              {reviews.length}
            </span>
            <span className="text-[11px] text-text-muted">Bewertungen</span>
          </div>
          <div className="h-4 w-px bg-border" aria-hidden />
          <div className="flex items-center gap-1 text-[11px] text-accent">
            <span aria-hidden>✓</span>
            <span className="hidden sm:inline">Sichere Online-Buchung</span>
            <span className="sm:hidden">Sicher</span>
          </div>
        </section>
      ) : null}

      {tenant.description ? (
        <section>
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Über uns
          </h2>
          <Card>
            <CardBody>
              <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                {tenant.description}
              </p>
            </CardBody>
          </Card>
        </section>
      ) : null}

      {locations.length > 1 ? (
        <section>
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Standort wählen
          </h2>
          <div className="grid gap-2">
            {locations.map((loc) => (
              <Link key={loc.id} href={`/book/${slug}/${loc.id}`}>
                <Card elevation="hoverable">
                  <CardBody>
                    <div className="font-medium text-text-primary">{loc.name}</div>
                    {loc.city ? (
                      <div className="mt-0.5 text-sm text-text-muted">{loc.city}</div>
                    ) : null}
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Services — Phorest-Style Kategorien-Folders (collapsible).
          Erste Kategorie ist default offen, der Rest geschlossen — schnellerer
          Scan auf Mobile, keine endlose Service-Wand. */}
      <section aria-label="Behandlungen wählen" className="space-y-2">
        {grouped.map(({ catId, catName, items }, idx) => (
          <details
            key={catId}
            open={idx === 0}
            className="group rounded-lg border border-border bg-surface open:bg-surface-elevated"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-surface-elevated [&::-webkit-details-marker]:hidden">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-lg font-semibold tracking-tight text-text-primary">
                  {catName}
                </span>
                <span className="text-xs text-text-muted">
                  {items.length} {items.length === 1 ? 'Behandlung' : 'Behandlungen'}
                </span>
              </div>
              <span
                aria-hidden
                className="text-text-muted transition-transform duration-200 group-open:rotate-180"
              >
                ▾
              </span>
            </summary>
            <div className="grid gap-2 border-t border-border/50 p-2">
              {items.map((s) => (
                <ServiceCardToggle
                  key={s.id}
                  slug={slug}
                  serviceId={s.id}
                  serviceName={s.name}
                  basePrice={s.basePrice}
                  durationMinutes={s.durationMinutes}
                  configureHref={`/book/${slug}/service/${s.id}/configure?location=${locations[0]?.id ?? ''}`}
                >
                  <CardBody className="flex items-center justify-between gap-4 py-4 pr-14">
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-lg font-semibold tracking-tight text-text-primary">
                        {s.name}
                      </div>
                      {s.description ? (
                        <div className="mt-0.5 text-sm text-text-secondary">{s.description}</div>
                      ) : null}
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-text-muted">
                        <span>{s.durationMinutes} Min</span>
                      </div>
                    </div>
                    <PriceDisplay amount={s.basePrice} size="lg" />
                  </CardBody>
                </ServiceCardToggle>
              ))}
            </div>
          </details>
        ))}
      </section>

      {/* Team */}
      {staff.length > 0 ? (
        <section>
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Unser Team
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {staff.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
              >
                <div className="flex items-start gap-3 p-4">
                  <Avatar
                    name={`${s.firstName} ${s.lastName}`}
                    color={s.color ?? 'hsl(var(--brand-accent))'}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-base font-semibold tracking-tight text-text-primary">
                      {s.displayName ?? `${s.firstName} ${s.lastName}`}
                    </div>
                    {s.bio ? (
                      <p className="mt-1 text-xs text-text-secondary line-clamp-3">{s.bio}</p>
                    ) : (
                      <p className="mt-1 text-xs italic text-text-muted">Freut sich auf dich.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Standort + Öffnungszeiten + Kontakt */}
      {primaryLocation ? (
        <section>
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Salon &amp; Kontakt
          </h2>
          <Card>
            <CardBody className="space-y-5">
              <div>
                <div className="text-sm font-medium text-text-primary">{primaryLocation.name}</div>
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

              <div>
                <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Öffnungszeiten
                </div>
                {hours ? (
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
                          {h.isToday ? <Badge tone="accent">Heute</Badge> : null}
                        </span>
                        <span>{h.text}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-muted">Öffnungszeiten auf Anfrage.</p>
                )}
              </div>
            </CardBody>
          </Card>
        </section>
      ) : null}

      {/* Gallery */}
      {gallery.length > 0 ? (
        <section>
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Gallerie
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {gallery.map((g) => (
              <img
                key={g.id}
                src={g.imageUrl}
                alt={g.caption ?? 'Gallerie'}
                className="aspect-square w-full rounded-md border border-border object-cover transition-transform hover:scale-[1.02]"
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Reviews */}
      {reviews.length > 0 ? (
        <section>
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Das sagen unsere Kundinnen
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {reviews.map((r) => (
              <Card key={r.id}>
                <CardBody>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">{r.authorName}</span>
                    <span className="text-xs tabular-nums text-accent">
                      {'★'.repeat(r.rating)}
                      <span className="text-text-muted">{'☆'.repeat(5 - r.rating)}</span>
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary whitespace-pre-line">{r.text}</p>
                  {r.sourceUrl ? (
                    <a
                      href={r.sourceUrl}
                      target="_blank"
                      rel="noopener"
                      className="mt-2 inline-block text-[11px] text-text-muted hover:text-accent"
                    >
                      Auf Google ansehen →
                    </a>
                  ) : null}
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      {faqs.length > 0 ? (
        <section>
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Häufige Fragen
          </h2>
          <div className="space-y-2">
            {faqs.map((f) => (
              <details
                key={f.id}
                className="group rounded-md border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-raised"
              >
                <summary className="cursor-pointer list-none text-sm font-medium text-text-primary">
                  <span className="mr-2 inline-block transition-transform group-open:rotate-90">
                    ›
                  </span>
                  {f.question}
                </summary>
                <div className="mt-2 whitespace-pre-line pl-5 text-sm text-text-secondary">
                  {f.answer}
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {/* Socials + Footer */}
      {tenant.instagramUrl ||
      tenant.facebookUrl ||
      tenant.tiktokUrl ||
      tenant.whatsappE164 ||
      tenant.googleBusinessUrl ? (
        <section className="flex flex-wrap justify-center gap-3 border-t border-border pt-6">
          {tenant.instagramUrl ? (
            <a
              href={tenant.instagramUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
            >
              📸 Instagram
            </a>
          ) : null}
          {tenant.tiktokUrl ? (
            <a
              href={tenant.tiktokUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
            >
              🎵 TikTok
            </a>
          ) : null}
          {tenant.facebookUrl ? (
            <a
              href={tenant.facebookUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
            >
              👤 Facebook
            </a>
          ) : null}
          {tenant.whatsappE164 ? (
            <a
              href={`https://wa.me/${tenant.whatsappE164.replace(/[^+\d]/g, '').replace(/^\+/, '')}`}
              target="_blank"
              rel="noopener"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-success bg-success/10 px-4 text-sm font-medium text-success transition-colors hover:bg-success/20"
            >
              💬 WhatsApp
            </a>
          ) : null}
          {tenant.googleBusinessUrl ? (
            <a
              href={tenant.googleBusinessUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
            >
              ⭐ Google Reviews
            </a>
          ) : null}
        </section>
      ) : null}

      <footer className="space-y-2 pt-6 text-center text-[11px] tracking-wider text-text-muted">
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={`/book/${slug}/impressum`} className="hover:text-text-primary">
            Impressum
          </Link>
          <span>·</span>
          <Link href={`/book/${slug}/datenschutz`} className="hover:text-text-primary">
            Datenschutz
          </Link>
        </div>
        <div>
          Powered by <span className="font-semibold">SALON OS</span>
        </div>
      </footer>

      <CookieConsent privacyHref={`/book/${slug}/datenschutz`} />
      <CartPill slug={slug} />
    </main>
  );
}
