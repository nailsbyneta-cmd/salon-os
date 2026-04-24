'use client';
import * as React from 'react';
import { Kbd } from '@salon-os/ui';

/**
 * Keyboard-Shortcuts-Overlay — öffnet sich bei "?"-Tastendruck.
 * Linear-Style. Zeigt alle globalen Shortcuts in Kategorien.
 *
 * Funktioniert nur wenn kein Input/Textarea im Focus hat.
 */
const SHORTCUTS: Array<{ group: string; items: Array<{ keys: string[]; label: string }> }> = [
  {
    group: 'Global',
    items: [
      { keys: ['?'], label: 'Shortcuts anzeigen' },
      { keys: ['⌘', 'K'], label: 'Command Palette' },
      { keys: ['⌘', '/'], label: 'Suche' },
    ],
  },
  {
    group: 'Navigation',
    items: [
      { keys: ['G', 'H'], label: 'Gehe zu Dashboard' },
      { keys: ['G', 'C'], label: 'Gehe zu Kalender' },
      { keys: ['G', 'K'], label: 'Gehe zu Kundinnen' },
      { keys: ['G', 'S'], label: 'Gehe zu Services' },
      { keys: ['G', 'W'], label: 'Gehe zu Warteliste' },
    ],
  },
  {
    group: 'Kalender',
    items: [
      { keys: ['N'], label: 'Neuer Termin' },
      { keys: ['T'], label: 'Heute' },
      { keys: ['←', '→'], label: 'Tag zurück/vor' },
      { keys: ['D', 'W', 'M'], label: 'Tag / Woche / Monat' },
    ],
  },
  {
    group: 'Termin-Detail',
    items: [
      { keys: ['C'], label: 'Einchecken' },
      { keys: ['S'], label: 'Starten' },
      { keys: ['F'], label: 'Fertig markieren' },
    ],
  },
];

export function ShortcutsHelp(): React.JSX.Element {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === '?' && !isInputFocused()) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return <></>;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-help-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 border-b border-border bg-surface/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
                Shortcuts
              </p>
              <h2 id="shortcuts-help-title" className="mt-1 font-display text-xl font-semibold">
                Tastatur-Befehle
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-2 text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
              aria-label="Schliessen"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <div className="space-y-6 p-6">
          {SHORTCUTS.map((group) => (
            <section key={group.group}>
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                {group.group}
              </h3>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-4 rounded-md px-3 py-2 transition-colors hover:bg-surface-raised/60"
                  >
                    <span className="text-sm text-text-primary">{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <React.Fragment key={i}>
                          {i > 0 ? <span className="text-xs text-text-muted">dann</span> : null}
                          <Kbd>{k}</Kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="border-t border-border bg-surface-raised/40 px-6 py-3 text-center text-[11px] text-text-muted">
          Drücke <Kbd>?</Kbd> oder <Kbd>Esc</Kbd> zum Schliessen
        </footer>
      </div>
    </div>
  );
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    (el as HTMLElement).isContentEditable === true
  );
}
