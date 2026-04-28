import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Button, Card, CardBody, Field, Input } from '@salon-os/ui';
import { requestMagicLink } from '../actions';

const COOKIE_NAME = 'salon_customer_session';
const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

/**
 * /book/[slug]/me/login
 *
 * Zwei Modi:
 * 1. Ohne ?token → Email-Form für Magic-Link-Request
 * 2. Mit ?token → Server-side Token-Exchange + Cookie + Redirect /me
 */
export default async function MagicLinkLogin({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string; sent?: string; error?: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const sp = await searchParams;

  // Mit Token → exchange + cookie + redirect
  if (sp.token) {
    try {
      const res = await fetch(`${API_URL}/v1/public/me/exchange`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: sp.token }),
        cache: 'no-store',
      });
      if (res.ok) {
        const data = (await res.json()) as { sessionToken: string };
        const cookieStore = await cookies();
        cookieStore.set(COOKIE_NAME, data.sessionToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60, // 30 Tage
        });
        redirect(`/book/${slug}/me`);
      }
      const errBody = (await res.json().catch(() => ({}))) as { detail?: string };
      redirect(`/book/${slug}/me/login?error=${encodeURIComponent(errBody.detail ?? 'invalid')}`);
    } catch {
      redirect(`/book/${slug}/me/login?error=netzwerk`);
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-6 py-10">
      <header>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">Mein Konto</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text-primary">
          Login per E-Mail
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Wir schicken Dir einen Login-Link per E-Mail. Kein Passwort nötig.
        </p>
      </header>

      {sp.sent ? (
        <Card elevation="flat" className="bg-accent/5">
          <CardBody className="space-y-2 text-center">
            <div aria-hidden className="text-3xl">
              ✉️
            </div>
            <p className="font-display text-base font-semibold text-text-primary">
              Schau in Deinem Posteingang
            </p>
            <p className="text-sm text-text-secondary">
              Falls Deine E-Mail bei uns hinterlegt ist, kommt gleich ein Login-Link. Der Link ist
              30 Min gültig.
            </p>
            <p className="pt-2 text-[11px] text-text-muted">
              Keine Mail erhalten? Schau im Spam-Ordner oder versuche es nochmal.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <form action={requestMagicLink} className="space-y-4">
              <input type="hidden" name="slug" value={slug} />
              <Field label="E-Mail" required>
                <Input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="deine.mail@beispiel.ch"
                />
              </Field>
              <Button type="submit" variant="accent" size="lg" className="w-full">
                Login-Link schicken
              </Button>
              {sp.error ? (
                <p className="text-center text-xs text-danger">
                  Etwas ist schief gelaufen — versuche es nochmal.
                </p>
              ) : null}
            </form>
          </CardBody>
        </Card>
      )}

      <div className="text-center">
        <Link
          href={`/book/${slug}`}
          className="text-xs text-text-muted transition-colors hover:text-text-primary"
        >
          ← Zurück zur Übersicht
        </Link>
      </div>
    </main>
  );
}
