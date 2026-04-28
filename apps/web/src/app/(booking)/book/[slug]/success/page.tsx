import Link from 'next/link';
import { Button, Card, CardBody } from '@salon-os/ui';
import { ConversionFire } from '@/components/conversion-fire';
import { ShareButton } from './share-button';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface SalonInfo {
  tenant: {
    name: string;
    whatsappE164: string | null;
    instagramUrl: string | null;
    googleBusinessUrl: string | null;
  };
  locations: Array<{ phone: string | null; email: string | null }>;
  adsTracking?: {
    googleAdsId: string | null;
    ga4MeasurementId: string | null;
    conversionLabels: Record<string, string | null>;
  };
}

interface AppointmentSummary {
  summary: { valueChf: number; currency: string; status: string } | null;
}

async function loadSalon(slug: string): Promise<SalonInfo | null> {
  try {
    const res = await fetch(`${API_URL}/v1/public/${slug}/info`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as SalonInfo;
  } catch {
    return null;
  }
}

async function loadSummary(
  slug: string,
  appointmentId: string,
): Promise<AppointmentSummary['summary']> {
  try {
    const res = await fetch(
      `${API_URL}/v1/public/${slug}/appointments/${appointmentId}/summary`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    return ((await res.json()) as AppointmentSummary).summary;
  } catch {
    return null;
  }
}

export default async function BookingSuccess({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ id?: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const { id } = await searchParams;
  const [salon, summary] = await Promise.all([
    loadSalon(slug),
    id ? loadSummary(slug, id) : Promise.resolve(null),
  ]);

  const salonName = salon?.tenant.name ?? 'uns';
  const phone = salon?.locations[0]?.phone ?? null;
  const whatsapp = salon?.tenant.whatsappE164 ?? null;
  const conversionSendTo = salon?.adsTracking?.conversionLabels?.['booking_completed'] ?? null;

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center space-y-8 py-10">
      {/* Google-Ads + GA4 Conversion-Fire (Capability 1+2). Idempotent
          per appointmentId — kein Doppel-Fire bei Reload. */}
      {id && summary && summary.status !== 'CANCELLED' ? (
        <ConversionFire
          conversionSendTo={conversionSendTo}
          valueChf={summary.valueChf}
          appointmentId={id}
          currency={summary.currency}
        />
      ) : null}

      {/* Celebration-Mark — Gold-Ring mit Check */}
      <div className="relative">
        <div
          className="animate-[celebrate_600ms_cubic-bezier(0.16,1,0.3,1)] flex h-24 w-24 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-glow"
          aria-hidden
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-12 w-12"
          >
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">Gebucht</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-text-primary md:text-5xl">
          Wir freuen uns auf dich
        </h1>
        <p className="mt-3 max-w-md text-sm text-text-secondary md:text-base">
          Deine Buchung ist bestätigt. Du erhältst gleich eine E-Mail mit allen Details. Bis bald
          bei {salonName}.
        </p>
        {id ? (
          <p className="mt-4 text-xs text-text-muted">
            Referenz: <span className="font-mono tracking-wider">{id.slice(0, 8)}</span>
          </p>
        ) : null}
      </div>

      {/* ICS-Download — funktioniert auch ohne POSTMARK */}
      {id ? (
        <a
          href={`${API_URL}/v1/public/${slug}/appointments/${id}/ics`}
          download
          className="flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-glow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98]"
        >
          <span aria-hidden>📅</span>
          Termin in Kalender eintragen
        </a>
      ) : null}

      {/* Contact-Shortcuts — nur rendern wenn mindestens 1 Kanal existiert.
          Audit Pass 12+13: leerer Box-Header 'Fragen? Wir sind da.' ohne
          Inhalt war Vertrauens-Killer. Lorenc muss WhatsApp + Telefon
          unter /settings einpflegen damit die Box erscheint. */}
      {whatsapp || phone ? (
        <Card elevation="flat" className="w-full max-w-md">
          <CardBody className="space-y-3">
            <p className="text-center text-xs text-text-muted">Fragen? Wir sind da.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {whatsapp ? (
                <a
                  href={`https://wa.me/${whatsapp.replace(/[^+\d]/g, '').replace(/^\+/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-md border border-accent/40 bg-accent/5 px-3 py-2.5 text-sm font-medium text-accent transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent/10 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
                >
                  💬 WhatsApp
                </a>
              ) : null}
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5 text-sm font-medium text-text-primary transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
                >
                  📞 Anrufen
                </a>
              ) : null}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="flex flex-wrap justify-center gap-3">
        <Link href={`/book/${slug}`}>
          <Button variant="ghost">← Zur Übersicht</Button>
        </Link>
        <ShareButton slug={slug} salonName={salonName} />
        {salon?.tenant.instagramUrl ? (
          <a href={salon.tenant.instagramUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost">Folge uns auf Instagram</Button>
          </a>
        ) : null}
      </div>

      <style>{`
        @keyframes celebrate {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
      `}</style>
    </main>
  );
}
