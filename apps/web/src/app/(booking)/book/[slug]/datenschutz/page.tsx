import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardBody } from '@salon-os/ui';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface Info {
  tenant: { name: string; countryCode: string };
  locations: Array<{ email: string | null }>;
}

async function loadInfo(slug: string): Promise<Info | null> {
  try {
    const res = await fetch(`${API_URL}/v1/public/${slug}/info`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as Info;
  } catch {
    return null;
  }
}

export default async function DatenschutzPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const info = await loadInfo(slug);
  if (!info) notFound();
  const contactEmail = info.locations[0]?.email ?? null;

  return (
    <main className="space-y-6">
      <Link
        href={`/book/${slug}`}
        className="inline-flex text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        ← Zurück
      </Link>

      <header>
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Datenschutz
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text-primary">
          Datenschutzerklärung
        </h1>
      </header>

      <Card>
        <CardBody className="space-y-5 text-sm text-text-secondary">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              1. Verantwortlich
            </h2>
            <p className="mt-2">
              {info.tenant.name} ist verantwortlich für die Verarbeitung der
              auf dieser Website und über die Online-Buchung erhobenen
              personenbezogenen Daten im Sinne des Schweizer
              Datenschutzgesetzes (DSG) sowie — soweit anwendbar — der
              EU-Datenschutz-Grundverordnung (DSGVO).
              {contactEmail ? (
                <>
                  {' '}Kontakt:{' '}
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-accent hover:underline"
                  >
                    {contactEmail}
                  </a>
                  .
                </>
              ) : null}
            </p>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              2. Welche Daten wir verarbeiten
            </h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Name, Vorname, Telefon, E-Mail-Adresse</li>
              <li>Termindaten (Service, Zeitpunkt, Mitarbeiterin)</li>
              <li>Notizen zur Behandlung, wenn du diese freiwillig angibst</li>
              <li>
                Technische Daten (IP-Adresse, Browser-Typ) bei Aufruf der
                Online-Booking-Seite
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              3. Warum wir Daten verarbeiten
            </h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                Abwicklung und Bestätigung deines Termins (vertragliche
                Pflicht)
              </li>
              <li>
                Terminbestätigungen und Erinnerungen per E-Mail (berechtigtes
                Interesse)
              </li>
              <li>
                Kundenhistorie für bessere Betreuung beim nächsten Besuch
                (berechtigtes Interesse)
              </li>
              <li>
                Marketing-Mailings NUR wenn du ausdrücklich zugestimmt hast
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              4. Weitergabe an Dritte
            </h2>
            <p className="mt-2">
              Wir geben deine Daten nur dann an Dritte weiter, wenn es für die
              Vertragsabwicklung nötig ist (z.B. E-Mail-Versand via Postmark,
              Zahlungsabwicklung via Stripe). Alle Auftragsverarbeiter sind
              DSGVO-konform.
            </p>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              5. Aufbewahrung
            </h2>
            <p className="mt-2">
              Termin- und Kundendaten werden für die Dauer der Kundenbeziehung
              + 10 Jahre (Schweizer Buchhaltungsgesetz) aufbewahrt. Du kannst
              jederzeit die Löschung verlangen; wir löschen alle nicht
              gesetzlich aufbewahrungspflichtigen Daten.
            </p>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              6. Deine Rechte
            </h2>
            <p className="mt-2">
              Du hast jederzeit Anspruch auf Auskunft, Berichtigung, Löschung,
              Einschränkung der Verarbeitung, Widerspruch gegen die
              Verarbeitung und auf Datenübertragbarkeit. Schreib uns einfach
              {contactEmail ? (
                <>
                  {' '}an{' '}
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-accent hover:underline"
                  >
                    {contactEmail}
                  </a>
                  .
                </>
              ) : (
                ' — wir antworten innert 30 Tagen.'
              )}
            </p>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              7. Cookies
            </h2>
            <p className="mt-2">
              Diese Website verwendet nur technisch notwendige Cookies
              (Session, Theme-Präferenz). Es werden keine Tracking- oder
              Marketing-Cookies gesetzt. Keine Weitergabe an Google Analytics
              oder ähnliche Dienste.
            </p>
          </section>
        </CardBody>
      </Card>

      <p className="text-center text-[11px] text-text-muted">
        Stand:{' '}
        {new Date().toLocaleDateString('de-CH', {
          month: 'long',
          year: 'numeric',
        })}
      </p>
    </main>
  );
}
