'use client';
import { useState, useTransition } from 'react';
import { toggleFeature, deleteReview } from './actions';

interface Review {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  sourceUrl: string | null;
  featured: boolean;
  createdAt: string;
  submittedVia: string | null;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="tabular-nums text-accent" aria-label={`${rating} von 5 Sternen`}>
      {'★'.repeat(rating)}
      <span className="text-text-muted">{'☆'.repeat(5 - rating)}</span>
    </span>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  auto_email: 'E-Mail',
  manual: 'Manuell',
  google_import: 'Google',
};

export function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isLong = review.text.length > 200;

  function handleToggleFeature() {
    startTransition(async () => {
      await toggleFeature(review.id, !review.featured);
    });
  }

  function handleDelete() {
    if (!window.confirm(`Review von ${review.authorName} wirklich löschen?`)) return;
    startTransition(async () => {
      await deleteReview(review.id);
    });
  }

  const displayText = isLong && !expanded ? review.text.slice(0, 200) + '…' : review.text;

  return (
    <div
      className={`rounded-lg border bg-surface p-4 transition-opacity ${isPending ? 'opacity-50' : ''} ${
        review.featured ? 'border-accent/40' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">{review.authorName}</span>
            <StarDisplay rating={review.rating} />
            {review.featured ? (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                Featured
              </span>
            ) : null}
            {review.submittedVia ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-muted">
                {SOURCE_LABELS[review.submittedVia] ?? review.submittedVia}
              </span>
            ) : null}
            <span className="text-[11px] text-text-muted">
              {new Date(review.createdAt).toLocaleDateString('de-CH', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </span>
          </div>

          {/* Review text */}
          <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">{displayText}</p>
          {isLong ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-[11px] text-accent hover:underline"
            >
              {expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
            </button>
          ) : null}

          {/* Source URL */}
          {review.sourceUrl ? (
            <a
              href={review.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-[11px] text-accent hover:underline"
            >
              Quelle ansehen →
            </a>
          ) : null}
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={handleToggleFeature}
            disabled={isPending}
            title={review.featured ? 'Von Featured entfernen' : 'Als Featured markieren'}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              review.featured
                ? 'border-accent/50 bg-accent/10 text-accent hover:bg-accent/20'
                : 'border-border bg-surface text-text-secondary hover:border-accent/50 hover:text-accent'
            }`}
          >
            {review.featured ? '★ Unfeature' : '☆ Feature'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-red-400/60 hover:text-red-500"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}
