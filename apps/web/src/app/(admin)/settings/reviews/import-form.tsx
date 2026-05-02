'use client';
import { useRef, useState, useTransition } from 'react';
import { importReview } from './actions';

export function ImportReviewModal() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await importReview(formData);
        setOpen(false);
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
      >
        + Review importieren
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-text-primary">Review importieren</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-text-muted hover:text-text-primary"
                aria-label="Schliessen"
              >
                ✕
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} className="space-y-4 p-5">
              {error ? (
                <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-500">
                  {error}
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  name="authorName"
                  required
                  maxLength={120}
                  placeholder="Anna M."
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Bewertung <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="flex cursor-pointer items-center gap-1">
                      <input
                        type="radio"
                        name="rating"
                        value={String(n)}
                        defaultChecked={n === 5}
                        className="accent-accent"
                      />
                      <span className="text-sm text-accent">{'★'.repeat(n)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Text <span className="text-red-400">*</span>
                </label>
                <textarea
                  name="text"
                  required
                  rows={4}
                  maxLength={3000}
                  placeholder="Beste Behandlung meines Lebens…"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Quelle URL (optional)
                </label>
                <input
                  name="sourceUrl"
                  type="url"
                  maxLength={500}
                  placeholder="https://g.page/…/review/…"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary hover:bg-surface-raised"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50 hover:opacity-90"
                >
                  {isPending ? 'Wird importiert…' : 'Importieren'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
