import Link from 'next/link';

export default function Home(): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
        Phase 1 — Modul 1
      </p>
      <h1 className="text-5xl font-semibold tracking-tight">SALON OS</h1>
      <p className="max-w-xl text-lg text-neutral-600">
        Monorepo steht. Die ersten API-Module (Clients, Services, Appointments)
        sind da. Nächste Schritte: WorkOS-Auth + Kalender-UI mit Drag &amp; Drop.
      </p>
      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link
          href="/calendar"
          className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white"
        >
          Kalender öffnen
        </Link>
        <Link
          href="/clients"
          className="rounded-md border border-neutral-300 px-4 py-2 font-medium"
        >
          Kundinnen
        </Link>
      </div>
      <nav className="mt-4 flex flex-wrap gap-3 text-xs text-neutral-500">
        <a className="underline underline-offset-4" href="http://localhost:4000/health">
          API-Health
        </a>
        <span className="text-neutral-300">·</span>
        <a className="underline underline-offset-4" href="http://localhost:8025">
          Mailhog
        </a>
        <span className="text-neutral-300">·</span>
        <a className="underline underline-offset-4" href="http://localhost:9001">
          Minio
        </a>
      </nav>
    </main>
  );
}
