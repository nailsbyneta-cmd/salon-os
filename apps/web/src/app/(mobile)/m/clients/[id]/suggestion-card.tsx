'use client';
import * as React from 'react';
import { Button } from '@salon-os/ui';
import { acceptSuggestedPattern } from './actions';

interface Pattern {
  serviceId: string;
  staffId: string;
  intervalWeeks: number;
  weekday: number;
  hourOfDay: number;
  minuteOfHour: number;
  durationMinutes: number;
  matchCount: number;
  confidence: number;
  nextSuggestedAt: string;
  service: { name: string };
  staff: { firstName: string; lastName: string };
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

/**
 * AI-Suggestion-Card mit 1-Click-Annehmen.
 * Pure Client-Component damit useTransition für instant-feedback.
 */
export function SuggestionCard({
  clientId,
  pattern,
}: {
  clientId: string;
  pattern: Pattern;
}): React.JSX.Element {
  const [pending, startTransition] = React.useTransition();
  const [done, setDone] = React.useState(false);

  const accept = (): void => {
    startTransition(async () => {
      try {
        await acceptSuggestedPattern(clientId, {
          serviceId: pattern.serviceId,
          staffId: pattern.staffId,
          intervalWeeks: pattern.intervalWeeks,
          durationMinutes: pattern.durationMinutes,
          nextSuggestedAt: pattern.nextSuggestedAt,
        });
        setDone(true);
      } catch {
        /* TODO toast on error */
      }
    });
  };

  if (done) {
    return (
      <div className="rounded-lg border border-success/40 bg-success/10 p-4 text-center text-sm text-success">
        ✓ Serie angelegt — die nächsten 3 Termine sind vorgebucht.
      </div>
    );
  }

  const time = `${String(pattern.hourOfDay).padStart(2, '0')}:${String(
    pattern.minuteOfHour,
  ).padStart(2, '0')}`;
  const conf = Math.round(pattern.confidence * 100);

  return (
    <div className="relative overflow-hidden rounded-lg border border-accent/40 bg-gradient-to-br from-accent/10 to-accent/5 p-4">
      <div className="absolute right-3 top-3 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
        🤖 AI · {conf}% sicher
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
        Stamm-Kundinnen-Muster erkannt
      </p>
      <h3 className="mt-1 font-display text-base font-semibold text-text-primary">
        Wiederkehrender Termin vorschlagen?
      </h3>
      <p className="mt-2 text-sm text-text-secondary">
        Diese Kundin kommt seit {pattern.matchCount}× alle{' '}
        <span className="font-semibold text-text-primary">{pattern.intervalWeeks} Wochen</span> am{' '}
        <span className="font-semibold text-text-primary">
          {WEEKDAYS[pattern.weekday]} um {time}
        </span>{' '}
        für <span className="font-semibold text-text-primary">{pattern.service.name}</span> bei{' '}
        <span className="font-semibold text-text-primary">{pattern.staff.firstName}</span>.
      </p>
      <p className="mt-2 text-xs text-text-muted">
        Vorschlag: nächster Termin am{' '}
        {new Date(pattern.nextSuggestedAt).toLocaleDateString('de-CH', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })}{' '}
        um {time}.
      </p>
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="accent" size="sm" onClick={accept} disabled={pending}>
          {pending ? 'Anlegen…' : '✓ Serie anlegen'}
        </Button>
        <button
          type="button"
          onClick={() => setDone(true)}
          disabled={pending}
          className="text-xs text-text-muted hover:text-text-secondary"
        >
          Nicht jetzt
        </button>
      </div>
    </div>
  );
}
