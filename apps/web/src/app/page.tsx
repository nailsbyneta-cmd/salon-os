export default function Home(): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">Phase 0</p>
      <h1 className="text-5xl font-semibold tracking-tight">SALON OS</h1>
      <p className="max-w-xl text-lg text-neutral-600">
        Monorepo steht. Als Nächstes: Auth + Datenbank-Schema + Admin-Login.
      </p>
      <nav className="mt-4 flex gap-3 text-sm">
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
