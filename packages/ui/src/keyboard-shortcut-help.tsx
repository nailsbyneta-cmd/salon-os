import * as React from 'react';

import { Kbd } from './badge.js';
import { Modal } from './modal.js';

// ─── KeyboardShortcutHelp ─────────────────────────────────────
//
// `?`-Dialog. App-Root registriert den globalen Listener,
// die Komponente rendert die Liste strukturiert nach Gruppen.

export interface KeyboardShortcut {
  keys: string[];
  description: string;
}

export interface KeyboardShortcutGroup {
  group: string;
  items: KeyboardShortcut[];
}

export interface KeyboardShortcutHelpProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  shortcuts: KeyboardShortcutGroup[];
  /**
   * Default: öffnet sich auf `?`-Taste (shift+`/`), schließt auf Escape.
   * Wenn `open` controlled ist, bleibt dieser Listener inaktiv.
   */
  autoBindGlobal?: boolean;
}

export function KeyboardShortcutHelp({
  open,
  onOpenChange,
  shortcuts,
  autoBindGlobal = true,
}: KeyboardShortcutHelpProps): React.JSX.Element {
  const [internal, setInternal] = React.useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internal;

  const setIsOpen = React.useCallback(
    (v: boolean) => {
      if (isControlled) onOpenChange?.(v);
      else setInternal(v);
    },
    [isControlled, onOpenChange],
  );

  React.useEffect(() => {
    if (!autoBindGlobal || isControlled) return;
    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [autoBindGlobal, isControlled, setIsOpen]);

  return (
    <Modal
      open={isOpen}
      onOpenChange={setIsOpen}
      title="Tastatur-Shortcuts"
      description="Für schnelles Arbeiten am Desktop."
      size="md"
    >
      <div className="flex flex-col gap-5">
        {shortcuts.map((grp) => (
          <section key={grp.group}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {grp.group}
            </h3>
            <ul className="flex flex-col gap-1.5">
              {grp.items.map((sc, idx) => (
                <li
                  key={`${grp.group}-${idx}`}
                  className="flex items-center justify-between gap-4 rounded-md px-2 py-1.5 text-sm"
                >
                  <span>{sc.description}</span>
                  <span className="flex items-center gap-1">
                    {sc.keys.map((k, i) => (
                      <React.Fragment key={i}>
                        <Kbd>{k}</Kbd>
                        {i < sc.keys.length - 1 ? (
                          <span className="text-xs text-text-muted">+</span>
                        ) : null}
                      </React.Fragment>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
