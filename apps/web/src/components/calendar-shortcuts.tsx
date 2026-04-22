'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Kbd } from '@salon-os/ui';

/**
 * Keyboard-Shortcuts für den Admin-Kalender:
 *
 *   T  → zum heutigen Datum
 *   ←  → voriger Tag/Woche/Monat (je nach View)
 *   →  → nächster
 *   D  → Tag-View
 *   W  → Woche-View
 *   M  → Monat-View
 *   N  → Neuer Termin
 *
 * Ignoriert Events aus Inputs/Textareas/Selects + wenn Cmd/Ctrl/Alt/Shift
 * gedrückt ist (Browser-Shortcuts nicht entführen).
 */
interface Props {
  view: 'day' | 'week' | 'month';
  day: string;
  prevDate: string;
  nextDate: string;
  todayDate: string;
}

export function CalendarShortcuts({
  view,
  day,
  prevDate,
  nextDate,
  todayDate,
}: Props): React.JSX.Element | null {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      // Modifier → System-Shortcut, nicht abfangen (ausser ESC für Modal)
      if (e.key === 'Escape' && helpOpen) {
        setHelpOpen(false);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      // User tippt in Formular → nicht abfangen
      const target = e.target;
      if (target instanceof Element) {
        if (target.closest('input,textarea,select,[contenteditable="true"]')) return;
      }

      switch (e.key) {
        case '?':
          e.preventDefault();
          setHelpOpen((v) => !v);
          break;
        case 't':
        case 'T':
          e.preventDefault();
          router.push(`/calendar?view=${view}&date=${todayDate}`);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          router.push(`/calendar?view=${view}&date=${prevDate}`);
          break;
        case 'ArrowRight':
          e.preventDefault();
          router.push(`/calendar?view=${view}&date=${nextDate}`);
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          router.push(`/calendar?view=day&date=${day}`);
          break;
        case 'w':
        case 'W':
          e.preventDefault();
          router.push(`/calendar?view=week&date=${day}`);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          router.push(`/calendar?view=month&date=${day}`);
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          router.push(`/calendar/new?date=${day}`);
          break;
        default:
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, view, day, prevDate, nextDate, todayDate, helpOpen]);

  if (!helpOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kalender-Tastatur-Shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <button
        type="button"
        onClick={() => setHelpOpen(false)}
        aria-label="Schliessen"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
      />
      <div className="relative w-full max-w-sm rounded-lg border border-border bg-surface shadow-xl animate-fade-in">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Kalender-Shortcuts</h2>
          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            aria-label="Schliessen"
            className="text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </div>
        <ul className="space-y-2 px-5 py-4 text-sm">
          {[
            ['T', 'Heute'],
            ['←  →', 'Vor / Zurück'],
            ['D', 'Tag-Ansicht'],
            ['W', 'Woche-Ansicht'],
            ['M', 'Monat-Ansicht'],
            ['N', 'Neuer Termin'],
            ['?', 'Diese Hilfe'],
            ['Esc', 'Schliessen'],
          ].map(([key, label]) => (
            <li key={key} className="flex items-center justify-between gap-4">
              <span className="text-text-secondary">{label}</span>
              <Kbd>{key}</Kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
