/**
 * Step-Indicator für den Booking-Flow — oben auf jeder Seite sichtbar.
 *
 * 4 Schritte: Service · Auswahl · Termin · Bestätigen
 * - completed Steps: Gold-Check + Gold-Label
 * - current: Gold-Number + Gold-Label
 * - upcoming: Muted-Nummer + Muted-Label
 *
 * Reine CSS, keine JS-Interaktion nötig — Server-Component.
 */
export type BookingStep = 'service' | 'configure' | 'slot' | 'confirm';

const ORDER: BookingStep[] = ['service', 'configure', 'slot', 'confirm'];
const LABELS: Record<BookingStep, string> = {
  service: 'Service',
  configure: 'Auswahl',
  slot: 'Termin',
  confirm: 'Bestätigen',
};

export function BookingSteps({ current }: { current: BookingStep }): React.JSX.Element {
  const currentIdx = ORDER.indexOf(current);

  return (
    <nav
      aria-label="Booking-Schritte"
      className="mb-6 flex items-center justify-between gap-1 sm:gap-2"
    >
      {ORDER.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isActive = idx === currentIdx;

        return (
          <div
            key={step}
            className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2"
            aria-current={isActive ? 'step' : undefined}
          >
            <span
              className={[
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-all sm:h-7 sm:w-7 sm:text-xs',
                isDone
                  ? 'bg-accent text-accent-foreground shadow-glow'
                  : isActive
                    ? 'border-2 border-accent bg-transparent text-accent'
                    : 'border border-border bg-transparent text-text-muted',
              ].join(' ')}
              aria-hidden
            >
              {isDone ? '✓' : idx + 1}
            </span>
            <span
              className={[
                'truncate text-[10px] font-medium uppercase tracking-[0.15em] sm:text-[11px] sm:tracking-[0.2em]',
                isActive ? 'text-accent' : isDone ? 'text-text-secondary' : 'text-text-muted',
              ].join(' ')}
            >
              {LABELS[step]}
            </span>
            {idx < ORDER.length - 1 ? (
              <span
                className={['h-px flex-1', isDone ? 'bg-accent/40' : 'bg-border'].join(' ')}
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
