import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardBody } from '@salon-os/ui';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface Info {
  tenant: {
    name: string;
    countryCode: string;
    description: string | null;
  };
  locations: Array<{
    name: string;
    address1: string | null;
    address2: string | null;
    postalCode: string | null;
    city: string | null;
    countryCode: string;
    phone: string | null;
    email: string | null;
  }>;
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

function addressLine(
  loc: Info['locations'][number],
): Array<{ label: string; value: string }> {
  const lines: Array<{ label: string; value: string }> = [];
  if (loc.address1) lines.push({ label: 'Adresse', value: loc.address1 });
  if (loc.address2) lines.push({ label: '', value: loc.address2 });
  const cityLine = [loc.postalCode, loc.city].filter(Boolean).join(' ');
  if (cityLine) lines.push({ label: '', value: cityLine });
  if (loc.phone) lines.push({ label: 'Telefon', value: loc.phone });
  if (loc.email) lines.push({ label: 'E-Mail', value: loc.email });
  return lines;
}

export default async function ImpressumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const info = await loadInfo(slug);
  if (!info) notFound();
  const loc = info.locations[0] ?? null;

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
          Impressum
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text-primary">
          Angaben gemäss Art. 3 UWG
        </h1>
      </header>

      <Card>
        <CardBody className="space-y-5 text-sm">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Anbieter
            </h2>
            <p className="mt-2 text-base font-medium text-text-primary">
              {info.tenant.name}
            </p>
            {loc ? (
              <dl className="mt-2 space-y-1 text-text-secondary">
                {addressLine(loc).map((l, i) => (
                  <div key={i} className="flex gap-2">
                    {l.label ? (
                      <dt className="w-20 shrink-0 text-text-muted">
                        {l.label}
                      </dt>
                    ) : null}
                    <dd>{l.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Verantwortlich für den Inhalt
            </h2>
            <p className="mt-2 text-text-secondary">
              {info.tenant.name}
              {loc?.email ? ` · ${loc.email}` : ''}
            </p>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Haftungsausschluss
            </h2>
            <p className="mt-2 text-text-secondary">
              Die Inhalte dieser Website wurden mit grösstmöglicher Sorgfalt
              erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität
              der Inhalte können wir jedoch keine Gewähr übernehmen.
            </p>
            <p className="mt-2 text-text-secondary">
              Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine
              Haftung für die Inhalte externer Links. Für den Inhalt der
              verlinkten Seiten sind ausschliesslich deren Betreiber
              verantwortlich.
            </p>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Datenschutz
            </h2>
            <p className="mt-2 text-text-secondary">
              Zur Datenverarbeitung siehe{' '}
              <Link
                href={`/book/${slug}/datenschutz`}
                className="text-accent hover:underline"
              >
                Datenschutzerklärung
              </Link>
              .
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
