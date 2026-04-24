import Link from 'next/link';
import { Button } from '@salon-os/ui';

/**
 * Globale 404-Seite. Freundlich, brand-konform, mit klarem Weg zurück.
 */
export default function NotFound(): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-4 text-center">
      <div
        aria-hidden
        className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-4xl"
      >
        🔍
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">404</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Seite nicht gefunden
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          Der Link könnte veraltet sein oder die Seite wurde verschoben.
        </p>
      </div>
      <Link href="/">
        <Button variant="accent" size="lg">
          Zur Startseite →
        </Button>
      </Link>
    </main>
  );
}
