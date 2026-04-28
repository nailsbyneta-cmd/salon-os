import Link from 'next/link';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

/**
 * Login-Page. Klick auf "Mit WorkOS einloggen" triggert
 * GET /v1/public/auth/login auf API → Redirect zu WorkOS-AuthKit →
 * Callback → Cookie gesetzt → User landet auf `/`.
 *
 * Falls WORKOS-Envs nicht gesetzt sind, antwortet die API mit 503 — wir
 * zeigen dann eine Dev-Hint-Box an.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}): Promise<React.JSX.Element> {
  const sp = await searchParams;
  const errorMsg = sp.error;
  const redirectTo = sp.redirect ?? '/';

  const loginUrl = `${API_URL}/v1/public/auth/login?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold text-text-primary">SALON OS</h1>
          <p className="mt-2 text-sm text-text-muted">Login mit WorkOS AuthKit</p>
        </div>

        {errorMsg ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {decodeURIComponent(errorMsg)}
          </div>
        ) : null}

        <a
          href={loginUrl}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-glow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98]"
        >
          → Mit WorkOS einloggen
        </a>

        <div className="rounded-md border border-border bg-surface p-3 text-xs text-text-muted">
          <strong>Dev-Hinweis:</strong> Solange WORKOS_API_KEY nicht in der API gesetzt ist, läuft
          die App im Dev-Header-Modus (DEMO_TENANT_ID env). Du brauchst dieses Login dann nicht —
          direkt zu{' '}
          <Link href="/" className="underline">
            /
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
