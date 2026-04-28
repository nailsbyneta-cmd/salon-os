import { Badge, Button, Card, CardBody, Field, Input, Textarea } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { LocationHoursEditor } from '@/components/location-hours-editor';
import type { Schedule } from '@/components/schedule-editor';
import {
  createFaq,
  createGalleryImage,
  createReview,
  deleteFaq,
  deleteGalleryImage,
  deleteReview,
  toggleReviewFeatured,
  updateBranding,
  updateBookingSettings,
  updateFeatureSettings,
  updateNotificationSettings,
  updateLocation,
} from './actions';
import { BrandColorPicker } from './brand-color-picker';

interface TenantSettings {
  booking?: {
    onlineBookingEnabled?: boolean;
    cancellationHoursBefore?: number;
    requireDeposit?: boolean;
    defaultDepositPct?: number;
    defaultBufferBeforeMin?: number;
    defaultBufferAfterMin?: number;
    maxDaysAhead?: number;
    minHoursAhead?: number;
  };
  notifications?: {
    reminderHoursBefore?: number[];
    autoConfirmation?: boolean;
    postBookingMessage?: string | null;
    cancellationMessage?: string | null;
  };
  features?: {
    showPricesPublic?: boolean;
    showStaffPublic?: boolean;
    requirePhone?: boolean;
    allowWalkIn?: boolean;
  };
}

interface Tenant {
  id: string;
  name: string;
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
  settings?: TenantSettings | null;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
  active: boolean;
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
  order: number;
}

interface Loc {
  id: string;
  name: string;
  address1: string | null;
  address2: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  openingHours: unknown;
}

function normalizeHours(raw: unknown): Schedule | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const keys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
  const out: Schedule = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };
  let any = false;
  for (const k of keys) {
    const v = r[k];
    if (Array.isArray(v)) {
      const arr = v.filter(
        (x): x is { open: string; close: string } =>
          !!x &&
          typeof x === 'object' &&
          typeof (x as { open?: unknown }).open === 'string' &&
          typeof (x as { close?: unknown }).close === 'string',
      );
      out[k] = arr;
      if (arr.length > 0) any = true;
    }
  }
  return any ? out : out;
}

async function loadData(): Promise<{
  tenant: Tenant | null;
  faqs: FAQ[];
  reviews: Review[];
  gallery: GalleryImage[];
  locations: Loc[];
}> {
  const ctx = await getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };
  try {
    const [t, f, r, g, l] = await Promise.all([
      apiFetch<Tenant>('/v1/salon/tenant', auth),
      apiFetch<{ faqs: FAQ[] }>('/v1/salon/faqs', auth),
      apiFetch<{ reviews: Review[] }>('/v1/salon/reviews', auth),
      apiFetch<{ images: GalleryImage[] }>('/v1/salon/gallery', auth),
      apiFetch<{ locations: Loc[] }>('/v1/locations', auth),
    ]);
    return {
      tenant: t,
      faqs: f.faqs,
      reviews: r.reviews,
      gallery: g.images,
      locations: l.locations,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return {
        tenant: null,
        faqs: [],
        reviews: [],
        gallery: [],
        locations: [],
      };
    }
    throw err;
  }
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}): Promise<React.JSX.Element> {
  const { saved } = await searchParams;
  const { tenant, faqs, reviews, gallery, locations } = await loadData();
  const primaryLocation = locations[0] ?? null;

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <header className="mb-8">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
          Salon-Einstellungen
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
          Öffentliches Profil
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Alles was Kundinnen auf deiner Buchungs-Seite sehen: Branding, Team, FAQ, Bewertungen,
          Gallerie. Änderungen sind sofort live.
        </p>
        {saved ? (
          <div className="mt-3 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
            ✓ Gespeichert.
          </div>
        ) : null}
      </header>

      <nav className="mb-8 flex flex-wrap gap-2 text-xs">
        {[
          { id: 'standort', label: 'Standort' },
          { id: 'branding', label: 'Branding' },
          { id: 'faq', label: 'FAQ' },
          { id: 'reviews', label: 'Bewertungen' },
          { id: 'gallery', label: 'Gallerie' },
          { id: 'booking', label: 'Buchung' },
          { id: 'notifications', label: 'Benachrichtigungen' },
          { id: 'features', label: 'Features' },
        ].map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-text-secondary hover:bg-surface-raised"
          >
            {t.label}
          </a>
        ))}
      </nav>

      {/* ─── Branding ─── */}
      {primaryLocation ? (
        <section id="standort" className="mb-12 scroll-mt-24">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
            Standort · Adresse &amp; Kontakt
          </h2>
          <Card>
            <CardBody>
              <form action={updateLocation.bind(null, primaryLocation.id)} className="space-y-4">
                <Field label="Salon-Name" required>
                  <Input name="name" defaultValue={primaryLocation.name} required />
                </Field>
                <Field label="Adresse Zeile 1">
                  <Input
                    name="address1"
                    defaultValue={primaryLocation.address1 ?? ''}
                    placeholder="Musterstrasse 1"
                  />
                </Field>
                <Field label="Adresse Zeile 2 (optional)">
                  <Input
                    name="address2"
                    defaultValue={primaryLocation.address2 ?? ''}
                    placeholder="2. Stock"
                  />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
                  <Field label="PLZ">
                    <Input
                      name="postalCode"
                      defaultValue={primaryLocation.postalCode ?? ''}
                      placeholder="9000"
                    />
                  </Field>
                  <Field label="Ort">
                    <Input
                      name="city"
                      defaultValue={primaryLocation.city ?? ''}
                      placeholder="St. Gallen"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Telefon">
                    <Input
                      type="tel"
                      name="phone"
                      defaultValue={primaryLocation.phone ?? ''}
                      placeholder="+41 71 123 45 67"
                    />
                  </Field>
                  <Field label="E-Mail">
                    <Input
                      type="email"
                      name="email"
                      defaultValue={primaryLocation.email ?? ''}
                      placeholder="hallo@salon.ch"
                    />
                  </Field>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="primary">
                    Standort speichern
                  </Button>
                </div>
                <p className="text-xs text-text-muted">
                  Wird auf Public-Buchungsseite (/book/…) und in Impressum/ Datenschutz angezeigt.
                </p>
              </form>
            </CardBody>
          </Card>

          <div className="mt-4">
            <LocationHoursEditor
              locationId={primaryLocation.id}
              initial={normalizeHours(primaryLocation.openingHours)}
            />
          </div>
        </section>
      ) : null}

      <section id="branding" className="mb-12 scroll-mt-24">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
          Branding &amp; Social Media
        </h2>
        <Card>
          <CardBody>
            <form action={updateBranding} className="space-y-5">
              <Field
                label="Tagline"
                hint="Ein Satz der beschreibt, was ihr macht — erscheint unter dem Salon-Namen im Hero."
              >
                <Input
                  name="tagline"
                  defaultValue={tenant?.tagline ?? ''}
                  placeholder="Das ruhigste Brauen-Studio in St.Gallen"
                  maxLength={300}
                />
              </Field>
              <Field
                label="Beschreibung"
                hint="Längerer Text für „Über uns“. Zeilenumbrüche werden übernommen."
              >
                <Textarea
                  name="description"
                  rows={4}
                  defaultValue={tenant?.description ?? ''}
                  placeholder="Seit 2019 behandle ich Augenbrauen & Wimpern mit Fokus auf natürlichem Look…"
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Logo-URL" hint="Quadratisches PNG/SVG, idealerweise ≥ 256×256">
                  <Input
                    name="logoUrl"
                    defaultValue={tenant?.logoUrl ?? ''}
                    placeholder="https://…/logo.png"
                  />
                </Field>
                <Field label="Hero-Bild-URL" hint="Breites Titelbild, ≥ 1600×900">
                  <Input
                    name="heroImageUrl"
                    defaultValue={tenant?.heroImageUrl ?? ''}
                    placeholder="https://…/hero.jpg"
                  />
                </Field>
              </div>

              <BrandColorPicker initial={tenant?.brandColor ?? ''} />

              <div className="border-t border-border pt-4">
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                  Social Media
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Instagram">
                    <Input
                      name="instagramUrl"
                      defaultValue={tenant?.instagramUrl ?? ''}
                      placeholder="https://instagram.com/…"
                    />
                  </Field>
                  <Field label="TikTok">
                    <Input
                      name="tiktokUrl"
                      defaultValue={tenant?.tiktokUrl ?? ''}
                      placeholder="https://tiktok.com/@…"
                    />
                  </Field>
                  <Field label="Facebook">
                    <Input
                      name="facebookUrl"
                      defaultValue={tenant?.facebookUrl ?? ''}
                      placeholder="https://facebook.com/…"
                    />
                  </Field>
                  <Field label="WhatsApp-Nummer (E.164)">
                    <Input
                      name="whatsappE164"
                      defaultValue={tenant?.whatsappE164 ?? ''}
                      placeholder="+41791234567"
                    />
                  </Field>
                  <Field label="Google Business-Profil URL">
                    <Input
                      name="googleBusinessUrl"
                      defaultValue={tenant?.googleBusinessUrl ?? ''}
                      placeholder="https://g.page/…"
                    />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary">
                  Branding speichern
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="mb-12 scroll-mt-24">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
          FAQ · Häufige Fragen
        </h2>
        <Card className="mb-4">
          <CardBody>
            <form action={createFaq} className="space-y-3">
              <Field label="Frage" required>
                <Input name="question" placeholder="Muss ich eine Anzahlung leisten?" required />
              </Field>
              <Field label="Antwort" required>
                <Textarea
                  name="answer"
                  rows={3}
                  placeholder="Nein — bei neuen Kundinnen bitten wir aber um Bestätigung per Email."
                  required
                />
              </Field>
              <Field label="Reihenfolge (niedrig = oben)">
                <Input name="order" type="number" defaultValue={faqs.length} />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" variant="secondary">
                  + Frage hinzufügen
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {faqs.length === 0 ? (
          <p className="text-xs text-text-muted">
            Keine FAQ angelegt. Antworte auf die 3–5 Fragen, die dir am häufigsten gestellt werden.
          </p>
        ) : (
          <ul className="space-y-2">
            {faqs.map((f) => (
              <li key={f.id}>
                <Card>
                  <CardBody className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-text-primary">
                        #{f.order} · {f.question}
                      </div>
                      <div className="mt-1 text-sm text-text-secondary whitespace-pre-line">
                        {f.answer}
                      </div>
                      {!f.active ? <Badge tone="warning">Inaktiv</Badge> : null}
                    </div>
                    <form action={deleteFaq.bind(null, f.id)}>
                      <Button type="submit" variant="ghost" size="sm">
                        Löschen
                      </Button>
                    </form>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── Reviews ─── */}
      <section id="reviews" className="mb-12 scroll-mt-24">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
          Bewertungen
        </h2>
        <Card className="mb-4">
          <CardBody>
            <form action={createReview} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Name" required>
                  <Input name="authorName" placeholder="Anna M." required />
                </Field>
                <Field label="Sterne (1–5)" required>
                  <Input name="rating" type="number" min={1} max={5} defaultValue={5} required />
                </Field>
              </div>
              <Field label="Text" required>
                <Textarea
                  name="text"
                  rows={3}
                  placeholder="Beste Behandlung meines Lebens…"
                  required
                />
              </Field>
              <Field label="Quelle (optional)" hint="Google-Link z.B.">
                <Input name="sourceUrl" placeholder="https://g.page/…/review/…" />
              </Field>
              <label className="flex items-center gap-2 text-xs text-text-secondary">
                <input type="checkbox" name="featured" className="h-3.5 w-3.5 accent-accent" />
                Auf Booking-Seite prominent zeigen
              </label>
              <div className="flex justify-end">
                <Button type="submit" variant="secondary">
                  + Bewertung hinzufügen
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {reviews.length === 0 ? (
          <p className="text-xs text-text-muted">
            Noch keine Bewertungen übertragen. Kopiere sie aus Google oder tippe sie ab.
          </p>
        ) : (
          <ul className="space-y-2">
            {reviews.map((r) => (
              <li key={r.id}>
                <Card>
                  <CardBody className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">
                          {r.authorName}
                        </span>
                        <span className="text-xs tabular-nums text-accent">
                          {'★'.repeat(r.rating)}
                          {'☆'.repeat(5 - r.rating)}
                        </span>
                        {r.featured ? <Badge tone="accent">Featured</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-text-secondary whitespace-pre-line">
                        {r.text}
                      </p>
                      {r.sourceUrl ? (
                        <a
                          href={r.sourceUrl}
                          target="_blank"
                          rel="noopener"
                          className="mt-1 inline-block text-[11px] text-accent hover:underline"
                        >
                          Quelle →
                        </a>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-1">
                      <form action={toggleReviewFeatured.bind(null, r.id, !r.featured)}>
                        <Button type="submit" variant="ghost" size="sm">
                          {r.featured ? 'Unfeature' : 'Feature'}
                        </Button>
                      </form>
                      <form action={deleteReview.bind(null, r.id)}>
                        <Button type="submit" variant="ghost" size="sm">
                          Löschen
                        </Button>
                      </form>
                    </div>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── Gallery ─── */}
      <section id="gallery" className="mb-12 scroll-mt-24">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
          Gallerie
        </h2>
        <p className="mb-3 text-xs text-text-muted">
          Füge Bilder per URL hinzu — z.B. Links aus Instagram-CDN, Imgur, Cloudinary. Direkter
          Upload kommt später.
        </p>
        <Card className="mb-4">
          <CardBody>
            <form action={createGalleryImage} className="space-y-3">
              <Field label="Bild-URL" required>
                <Input name="imageUrl" type="url" placeholder="https://…/bild.jpg" required />
              </Field>
              <Field label="Bildunterschrift (optional)">
                <Input name="caption" placeholder="Braunlaminierung auf Anna" />
              </Field>
              <Field label="Reihenfolge">
                <Input name="order" type="number" defaultValue={gallery.length} />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" variant="secondary">
                  + Bild hinzufügen
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {gallery.length === 0 ? (
          <p className="text-xs text-text-muted">Keine Bilder.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {gallery.map((g) => (
              <li key={g.id} className="group relative">
                <img
                  src={g.imageUrl}
                  alt={g.caption ?? 'Gallerie'}
                  className="aspect-square w-full rounded-md border border-border object-cover"
                />
                {g.caption ? (
                  <div className="mt-1 text-xs text-text-muted truncate">{g.caption}</div>
                ) : null}
                <form
                  action={deleteGalleryImage.bind(null, g.id)}
                  className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Button type="submit" variant="danger" size="sm">
                    ×
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── Booking-Settings ─── */}
      <section id="booking" className="mb-12 scroll-mt-24">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          Buchungs-Einstellungen
        </h2>
        <Card>
          <CardBody>
            <form action={updateBookingSettings} className="space-y-5">
              <label className="flex items-center gap-3 rounded-md border border-border bg-surface-raised/40 p-3">
                <input
                  type="checkbox"
                  name="onlineBookingEnabled"
                  defaultChecked={tenant?.settings?.booking?.onlineBookingEnabled ?? true}
                  className="h-4 w-4"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">
                    Online-Buchung aktiviert
                  </div>
                  <div className="text-xs text-text-muted">
                    Kundinnen können über die öffentliche Booking-Seite buchen
                  </div>
                </div>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Stornierung bis X Stunden vor Termin"
                  hint="Nach dieser Frist kann Kundin nicht mehr selbst stornieren"
                >
                  <Input
                    type="number"
                    name="cancellationHoursBefore"
                    min={0}
                    max={168}
                    defaultValue={tenant?.settings?.booking?.cancellationHoursBefore ?? 24}
                  />
                </Field>
                <Field
                  label="Max. Vorausbuchung (Tage)"
                  hint="Wie weit im Voraus Kundin buchen kann"
                >
                  <Input
                    type="number"
                    name="maxDaysAhead"
                    min={1}
                    max={365}
                    defaultValue={tenant?.settings?.booking?.maxDaysAhead ?? 60}
                  />
                </Field>
                <Field
                  label="Mindest-Vorlauf (Stunden)"
                  hint="Nicht spontaner als X Stunden vorher buchbar"
                >
                  <Input
                    type="number"
                    name="minHoursAhead"
                    min={0}
                    max={72}
                    defaultValue={tenant?.settings?.booking?.minHoursAhead ?? 0}
                  />
                </Field>
                <Field label="Default Anzahlung in %" hint="0 = keine Anzahlung verlangen">
                  <Input
                    type="number"
                    name="defaultDepositPct"
                    min={0}
                    max={100}
                    step="5"
                    defaultValue={tenant?.settings?.booking?.defaultDepositPct ?? 0}
                  />
                </Field>
                <Field
                  label="Puffer vor Termin (Min)"
                  hint="Zeit die automatisch vor Service reserviert wird"
                >
                  <Input
                    type="number"
                    name="defaultBufferBeforeMin"
                    min={0}
                    max={60}
                    step="5"
                    defaultValue={tenant?.settings?.booking?.defaultBufferBeforeMin ?? 0}
                  />
                </Field>
                <Field
                  label="Puffer nach Termin (Min)"
                  hint="Für Aufräumen / Übergang zwischen Kundinnen"
                >
                  <Input
                    type="number"
                    name="defaultBufferAfterMin"
                    min={0}
                    max={60}
                    step="5"
                    defaultValue={tenant?.settings?.booking?.defaultBufferAfterMin ?? 0}
                  />
                </Field>
              </div>

              <label className="flex items-center gap-3 rounded-md border border-border bg-surface-raised/40 p-3">
                <input
                  type="checkbox"
                  name="requireDeposit"
                  defaultChecked={tenant?.settings?.booking?.requireDeposit ?? false}
                  className="h-4 w-4"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">
                    Anzahlung bei Online-Buchung verlangen
                  </div>
                  <div className="text-xs text-text-muted">
                    Reduziert No-Shows um durchschnittlich 40%
                  </div>
                </div>
              </label>

              <div className="flex justify-end">
                <Button type="submit" variant="primary">
                  Speichern
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </section>

      {/* ─── Notifications ─── */}
      <section id="notifications" className="mb-12 scroll-mt-24">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          Benachrichtigungen · Reminder-Templates
        </h2>
        <Card>
          <CardBody>
            <form action={updateNotificationSettings} className="space-y-5">
              <Field
                label="Reminder-Zeiten (Stunden vor Termin)"
                hint="Komma-getrennt, max 5 Reminder. Beispiel: 24, 2 = 1 Tag + 2 h vorher"
              >
                <Input
                  name="reminderHoursBefore"
                  defaultValue={(
                    tenant?.settings?.notifications?.reminderHoursBefore ?? [24, 2]
                  ).join(', ')}
                  placeholder="24, 2"
                />
              </Field>

              <label className="flex items-center gap-3 rounded-md border border-border bg-surface-raised/40 p-3">
                <input
                  type="checkbox"
                  name="autoConfirmation"
                  defaultChecked={tenant?.settings?.notifications?.autoConfirmation ?? true}
                  className="h-4 w-4"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">
                    Auto-Bestätigung direkt senden
                  </div>
                  <div className="text-xs text-text-muted">
                    E-Mail sofort nach Buchung statt Manuelle-Bestätigung
                  </div>
                </div>
              </label>

              <Field
                label="Bestätigungs-Nachricht (nach Buchung)"
                hint="Erscheint in der Bestätigungs-E-Mail. Platzhalter: {name}, {service}, {date}, {staff}"
              >
                <Textarea
                  name="postBookingMessage"
                  rows={3}
                  defaultValue={tenant?.settings?.notifications?.postBookingMessage ?? ''}
                  placeholder="Liebe {name}, wir freuen uns auf deinen Termin am {date} — bis bald!"
                />
              </Field>

              <Field label="Stornierungs-Nachricht" hint="E-Mail die bei Stornierung gesendet wird">
                <Textarea
                  name="cancellationMessage"
                  rows={3}
                  defaultValue={tenant?.settings?.notifications?.cancellationMessage ?? ''}
                  placeholder="Hallo {name}, dein Termin am {date} ist storniert. Kein Problem — wir freuen uns auf's nächste Mal."
                />
              </Field>

              <div className="flex justify-end">
                <Button type="submit" variant="primary">
                  Speichern
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </section>

      {/* ─── Features / Sichtbarkeit ─── */}
      <section id="features" className="mb-12 scroll-mt-24">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          Features · Sichtbarkeit
        </h2>
        <Card>
          <CardBody>
            <form action={updateFeatureSettings} className="space-y-3">
              {[
                {
                  name: 'showPricesPublic',
                  label: 'Preise auf Booking-Seite zeigen',
                  hint: 'Aus = nur „auf Anfrage"',
                  default: true,
                },
                {
                  name: 'showStaffPublic',
                  label: 'Team-Mitglieder öffentlich zeigen',
                  hint: 'Namen, Fotos, Bio im Online-Booking',
                  default: true,
                },
                {
                  name: 'requirePhone',
                  label: 'Telefon-Nummer Pflichtfeld',
                  hint: 'Anstatt optional beim Online-Booking',
                  default: false,
                },
                {
                  name: 'allowWalkIn',
                  label: 'Walk-In erlaubt',
                  hint: 'Kundinnen können ohne Termin kommen',
                  default: false,
                },
              ].map((f) => (
                <label
                  key={f.name}
                  className="flex items-center gap-3 rounded-md border border-border bg-surface-raised/40 p-3"
                >
                  <input
                    type="checkbox"
                    name={f.name}
                    defaultChecked={
                      tenant?.settings?.features?.[
                        f.name as keyof NonNullable<TenantSettings['features']>
                      ] ?? f.default
                    }
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-primary">{f.label}</div>
                    <div className="text-xs text-text-muted">{f.hint}</div>
                  </div>
                </label>
              ))}
              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary">
                  Speichern
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
