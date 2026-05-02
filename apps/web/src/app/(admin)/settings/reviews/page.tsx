import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { ReviewCard } from './review-card';
import { ImportReviewModal } from './import-form';

interface SalonReview {
  id: string;
  tenantId: string;
  authorName: string;
  rating: number;
  text: string;
  sourceUrl: string | null;
  featured: boolean;
  submittedVia: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReviewsResponse {
  reviews: SalonReview[];
  total: number;
  avgRating: number;
  distribution: Record<string, number>;
}

async function loadReviews(
  filters: {
    rating?: string;
    featured?: string;
    source?: string;
    page?: string;
  },
  auth: { tenantId: string; userId: string; role: string },
): Promise<ReviewsResponse> {
  const params = new URLSearchParams();
  if (filters.rating) params.set('rating', filters.rating);
  if (filters.featured) params.set('featured', filters.featured);
  if (filters.source) params.set('source', filters.source);
  params.set('page', filters.page ?? '1');
  params.set('limit', '20');

  try {
    return await apiFetch<ReviewsResponse>(`/v1/reviews?${params.toString()}`, auth);
  } catch (err) {
    if (err instanceof ApiError) {
      return { reviews: [], total: 0, avgRating: 0, distribution: {} };
    }
    throw err;
  }
}

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-4 shrink-0 text-right text-[11px] text-text-muted">{star}</span>
      <span className="text-xs text-accent">★</span>
      <div className="h-1.5 flex-1 rounded-full bg-surface-raised">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-7 shrink-0 text-right text-[11px] tabular-nums text-text-muted">
        {count}
      </span>
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="text-2xl text-accent" aria-label={`${rating} Sterne Durchschnitt`}>
      {'★'.repeat(Math.round(rating))}
      <span className="text-text-muted">{'☆'.repeat(5 - Math.round(rating))}</span>
    </span>
  );
}

export default async function ReviewsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    rating?: string;
    featured?: string;
    source?: string;
    page?: string;
  }>;
}): Promise<React.JSX.Element> {
  const sp = await searchParams;
  const ctx = await getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };

  const data = await loadReviews(sp, auth);

  const currentPage = Number.parseInt(sp.page ?? '1', 10);
  const totalPages = Math.ceil(data.total / 20);

  function filterUrl(overrides: Record<string, string | undefined>): string {
    const p = new URLSearchParams();
    const merged = { ...sp, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== '') p.set(k, v);
    }
    p.delete('page');
    return `/settings/reviews?${p.toString()}`;
  }

  function pageUrl(page: number): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v !== undefined) p.set(k, v);
    }
    p.set('page', String(page));
    return `/settings/reviews?${p.toString()}`;
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary"
      >
        ← Zurück zu Einstellungen
      </Link>

      {/* Header */}
      <header className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
            Einstellungen
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Bewertungen
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Alle Kundenbewertungen verwalten, featuren und importieren.
          </p>
        </div>
        <ImportReviewModal />
      </header>

      {/* Aggregate stats */}
      <section className="mb-6 grid gap-3 sm:grid-cols-[auto_1fr]">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
            Durchschnitt
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-text-primary">
              {data.avgRating.toFixed(1)}
            </span>
            <StarDisplay rating={data.avgRating} />
          </div>
          <div className="mt-0.5 text-xs text-text-muted">{data.total} Bewertungen</div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
            Verteilung
          </div>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => (
              <RatingBar
                key={star}
                star={star}
                count={data.distribution[String(star)] ?? 0}
                total={data.total}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Rating filter */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted">Sterne:</span>
          <a
            href={filterUrl({ rating: undefined })}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              !sp.rating
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border bg-surface text-text-secondary hover:border-accent/50'
            }`}
          >
            Alle
          </a>
          {[5, 4, 3, 2, 1].map((n) => (
            <a
              key={n}
              href={filterUrl({ rating: String(n) })}
              className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                sp.rating === String(n)
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border bg-surface text-text-secondary hover:border-accent/50'
              }`}
            >
              {'★'.repeat(n)}
            </a>
          ))}
        </div>

        {/* Featured filter */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted">Featured:</span>
          <a
            href={filterUrl({ featured: undefined })}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              !sp.featured
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border bg-surface text-text-secondary hover:border-accent/50'
            }`}
          >
            Alle
          </a>
          <a
            href={filterUrl({ featured: 'true' })}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              sp.featured === 'true'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border bg-surface text-text-secondary hover:border-accent/50'
            }`}
          >
            ★ Featured
          </a>
          <a
            href={filterUrl({ featured: 'false' })}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              sp.featured === 'false'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border bg-surface text-text-secondary hover:border-accent/50'
            }`}
          >
            Nicht featured
          </a>
        </div>

        {/* Source filter */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted">Quelle:</span>
          <a
            href={filterUrl({ source: undefined })}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              !sp.source
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border bg-surface text-text-secondary hover:border-accent/50'
            }`}
          >
            Alle
          </a>
          {(['auto_email', 'manual', 'google_import'] as const).map((src) => {
            const labels: Record<string, string> = {
              auto_email: 'E-Mail',
              manual: 'Manuell',
              google_import: 'Google',
            };
            return (
              <a
                key={src}
                href={filterUrl({ source: src })}
                className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  sp.source === src
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-surface text-text-secondary hover:border-accent/50'
                }`}
              >
                {labels[src]}
              </a>
            );
          })}
        </div>
      </div>

      {/* Reviews list */}
      {data.reviews.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">
            Keine Bewertungen gefunden.{' '}
            {sp.rating || sp.featured || sp.source
              ? 'Filter anpassen oder zurücksetzen.'
              : 'Importiere deine ersten Bewertungen.'}
          </p>
          {sp.rating || sp.featured || sp.source ? (
            <a
              href="/settings/reviews"
              className="mt-2 inline-block text-xs text-accent hover:underline"
            >
              Filter zurücksetzen
            </a>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {data.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 ? (
        <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
          <a
            href={currentPage > 1 ? pageUrl(currentPage - 1) : '#'}
            aria-disabled={currentPage <= 1}
            className={`rounded-md border border-border px-3 py-1.5 text-sm transition-colors ${
              currentPage <= 1
                ? 'pointer-events-none opacity-40'
                : 'text-text-secondary hover:border-accent/50 hover:text-text-primary'
            }`}
          >
            ← Zurück
          </a>
          <span className="text-xs text-text-muted">
            Seite {currentPage} von {totalPages} · {data.total} Bewertungen
          </span>
          <a
            href={currentPage < totalPages ? pageUrl(currentPage + 1) : '#'}
            aria-disabled={currentPage >= totalPages}
            className={`rounded-md border border-border px-3 py-1.5 text-sm transition-colors ${
              currentPage >= totalPages
                ? 'pointer-events-none opacity-40'
                : 'text-text-secondary hover:border-accent/50 hover:text-text-primary'
            }`}
          >
            Weiter →
          </a>
        </nav>
      ) : null}
    </div>
  );
}
