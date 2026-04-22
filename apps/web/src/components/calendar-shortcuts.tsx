'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';

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

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      // Modifier → System-Shortcut, nicht abfangen
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      // User tippt in Formular → nicht abfangen
      const target = e.target;
      if (target instanceof Element) {
        if (target.closest('input,textarea,select,[contenteditable="true"]')) return;
      }

      switch (e.key) {
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
  }, [router, view, day, prevDate, nextDate, todayDate]);

  return null;
}
