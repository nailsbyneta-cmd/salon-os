import Link from 'next/link';
import { Button } from '@salon-os/ui';

/**
 * 404 im Booking-Flow — warm, Dark-Mode-aware (über Layout-Wrapper),
 * führt zurück zur Salon-Landing.
 */
export default function BookingNotFound(): React.JSX.Element {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <div
        aria-hidden
        className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-3xl"
      >
        🤷‍♀️
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
          Nicht gefunden
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Diese Seite existiert nicht
        </h1>
        <p className="mt-2 text-sm text-text-secondary">Der Link könnte veraltet sein.</p>
      </div>
      <Link href="/">
        <Button variant="accent">Zur Startseite</Button>
      </Link>
    </main>
  );
}
