import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardBody, Field, Input, Textarea } from '@salon-os/ui';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface ReviewContext {
  appointmentId: string;
  tenantId: string;
  salonName: string;
  salonSlug: string;
  staffFirstName: string;
  serviceName: string;
  appointmentDate: string;
  alreadySubmitted: boolean;
  clientFirstName: string;
}

async function loadContext(token: string): Promise<ReviewContext | null> {
  try {
    const res = await fetch(`${API_URL}/v1/public/reviews/${encodeURIComponent(token)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as ReviewContext;
  } catch {
    return null;
  }
}

async function submitReview(
  token: string,
  payload: { rating: number; text: string; authorName: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  'use server';
  try {
    const res = await fetch(
      `${API_URL}/v1/public/reviews/${encodeURIComponent(token)}/submit`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      },
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { detail?: string; title?: string };
      return { ok: false, error: body.detail ?? body.title ?? 'Submit fehlgeschlagen' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Netzwerk-Fehler' };
  }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default async function ReviewSubmitPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{ submitted?: string; error?: string }>;
}): Promise<React.JSX.Element> {
  const { slug, token } = await params;
  const sp = await searchParams;
  const ctx = await loadContext(token);

  if (!ctx) {
    return (
      <main className="space-y-6 py-10">
        <Card>
          <CardBody className="text-center">
            <h1 className="font-display text-2xl font-semibold">Link ungültig</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Dieser Bewertungs-Link ist abgelaufen oder ungültig. Falls Du einen Fehler vermutest,
              schreib uns direkt.
            </p>
            <Link
              href={`/book/${slug}`}
              className="mt-4 inline-block text-sm text-accent hover:underline"
            >
              Zur Salon-Seite →
            </Link>
          </CardBody>
        </Card>
      </main>
    );
  }

  if (sp.submitted === '1' || ctx.alreadySubmitted) {
    return (
      <main className="space-y-6 py-10">
        <Card>
          <CardBody className="space-y-4 text-center">
            <div className="flex justify-center text-5xl text-accent">✓</div>
            <h1 className="font-display text-2xl font-semibold">Danke für Deine Bewertung</h1>
            <p className="text-sm text-text-secondary">
              Deine Rückmeldung hilft uns + anderen Kundinnen. Wir freuen uns auf Dein nächstes Mal.
            </p>
            <Link
              href={`/book/${slug}`}
              className="mt-2 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
            >
              Neuen Termin buchen
            </Link>
          </CardBody>
        </Card>
      </main>
    );
  }

  async function onSubmit(formData: FormData): Promise<void> {
    'use server';
    const rating = Number(formData.get('rating') ?? 0);
    const text = String(formData.get('text') ?? '').trim();
    const authorName = String(formData.get('authorName') ?? '').trim();

    if (!rating || rating < 1 || rating > 5) {
      redirect(`/book/${slug}/review/${token}?error=${encodeURIComponent('Bitte wähle 1-5 Sterne.')}`);
    }
    if (!text || text.length < 5) {
      redirect(`/book/${slug}/review/${token}?error=${encodeURIComponent('Bitte schreib einen kurzen Kommentar.')}`);
    }

    const res = await submitReview(token, {
      rating,
      text,
      authorName: authorName || (ctx?.clientFirstName ?? 'Kundin'),
    });
    if (res.ok) {
      redirect(`/book/${slug}/review/${token}?submitted=1`);
    } else {
      redirect(`/book/${slug}/review/${token}?error=${encodeURIComponent(res.error)}`);
    }
  }

  return (
    <main className="space-y-6 py-6">
      <header>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
          Deine Bewertung
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Wie war Dein Termin bei {ctx.staffFirstName}?
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {ctx.serviceName} · {fmtDate(ctx.appointmentDate)} · {ctx.salonName}
        </p>
      </header>

      {sp.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {decodeURIComponent(sp.error)}
        </div>
      ) : null}

      <Card>
        <CardBody>
          <form action={onSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-text-primary">
                Sterne <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2" role="radiogroup" aria-label="Bewertung">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label
                    key={n}
                    className="relative cursor-pointer text-3xl text-zinc-300 transition-colors hover:text-amber-400 has-[:checked]:text-amber-500 [&:has(:checked)~label]:text-zinc-300"
                  >
                    <input
                      type="radio"
                      name="rating"
                      value={n}
                      defaultChecked={n === 5}
                      className="sr-only"
                      aria-label={`${n} Stern${n === 1 ? '' : 'e'}`}
                    />
                    ★
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-text-muted">
                Tipp: 5 Sterne = wir kommen wieder. 1 Stern = wir hatten Probleme.
              </p>
            </div>

            <Field label="Dein Kommentar" required>
              <Textarea
                required
                name="text"
                rows={4}
                minLength={5}
                maxLength={2000}
                placeholder="Was hat Dir gefallen? Was können wir besser machen?"
              />
            </Field>

            <Field label="So sollen wir Dich nennen (optional)">
              <Input
                name="authorName"
                placeholder={ctx.clientFirstName ? `${ctx.clientFirstName} M.` : 'Vorname N.'}
                defaultValue={ctx.clientFirstName}
                maxLength={120}
              />
              <p className="mt-1 text-xs text-text-muted">
                Wird auf der Salon-Seite öffentlich neben Deiner Bewertung angezeigt.
              </p>
            </Field>

            <button
              type="submit"
              className="w-full rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-glow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98]"
            >
              Bewertung absenden
            </button>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
