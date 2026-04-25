import Link from 'next/link';
import { CartClient } from './cart-client';
import { BookingSteps } from '../booking-steps';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface Location {
  id: string;
}

async function loadFirstLocation(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/v1/public/${slug}/locations`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { locations: Location[] };
    return data.locations[0]?.id ?? null;
  } catch {
    return null;
  }
}

export default async function CartPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const locationId = await loadFirstLocation(slug);

  return (
    <main className="space-y-6">
      <BookingSteps current="slot" />

      <Link
        href={`/book/${slug}`}
        className="inline-flex text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        ← Zurück
      </Link>

      <header>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
          Multi-Service-Termin
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Deine Auswahl
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Wir suchen automatisch die beste Kombination — auch quer über mehrere Mitarbeiterinnen,
          falls deine Lieblings-Stylistin nicht alles kann.
        </p>
      </header>

      <CartClient slug={slug} locationId={locationId} />
    </main>
  );
}
