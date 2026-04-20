import Link from 'next/link';
import { Button, Card, CardBody } from '@salon-os/ui';

export default async function BookingSuccess({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ id?: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const { id } = await searchParams;
  return (
    <main className="space-y-6">
      <Card>
        <CardBody className="space-y-5 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="h-7 w-7"
              aria-hidden
            >
              <path
                d="M5 13l4 4L19 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary">
              Termin gebucht
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Du erhältst gleich eine Bestätigung per E-Mail. Bis bald 💛
            </p>
          </div>
          {id ? (
            <p className="text-xs text-text-muted">
              Referenz: <span className="font-mono">{id.slice(0, 8)}</span>
            </p>
          ) : null}
          <div className="flex justify-center gap-2 pt-2">
            <Link href={`/book/${slug}`}>
              <Button variant="secondary">Zurück zur Übersicht</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
