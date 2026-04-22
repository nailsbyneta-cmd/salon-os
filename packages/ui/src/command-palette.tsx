'use client';
import * as React from 'react';
import { cn } from './cn.js';
import { Kbd } from './badge.js';

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  group?: string;
  keywords?: string[];
  /** Wird beim Auswählen ausgeführt. Return void oder Promise. */
  action: () => void | Promise<void>;
  /** Für navigation-Items optional als href statt action */
  href?: string;
}

export interface CommandPaletteProps {
  items: CommandItem[];
  /** Open-Status kontrolliert; wenn nicht gesetzt: eigenes State via ⌘K */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  /**
   * Async-Loader: wird bei jedem Query-Change mit 150ms Debounce aufgerufen.
   * Rückgabewert wird zu `items` gemerged.
   */
  asyncItems?: (query: string) => Promise<CommandItem[]>;
}

function matches(item: CommandItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const fields = [item.label, item.hint ?? '', (item.keywords ?? []).join(' ')]
    .join(' ')
    .toLowerCase();
  // simple substring + fuzzy on initial chars
  return fields.includes(q);
}

/**
 * Universal Command Palette (⌘K / Strg+K).
 * Fuzzy-ish über Label + Keywords, Gruppierung, Keyboard-Nav,
 * Dark-Mode-ready, Fade + Slide Animation.
 */
export function CommandPalette({
  items,
  open: controlledOpen,
  onOpenChange,
  placeholder = 'Suchen oder Befehl eingeben…',
  asyncItems,
}: CommandPaletteProps): React.JSX.Element {
  const [uncontrolled, setUncontrolled] = React.useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = React.useCallback(
    (v: boolean) => {
      if (onOpenChange) onOpenChange(v);
      else setUncontrolled(v);
    },
    [onOpenChange],
  );

  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const [asyncResults, setAsyncResults] = React.useState<CommandItem[]>([]);
  const [, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const asyncSeq = React.useRef(0);

  // Debounced async loader
  React.useEffect(() => {
    if (!asyncItems || !open) {
      setAsyncResults([]);
      return;
    }
    if (query.trim().length < 2) {
      setAsyncResults([]);
      return;
    }
    const mySeq = ++asyncSeq.current;
    setLoading(true);
    const timer = setTimeout(() => {
      asyncItems(query)
        .then((results) => {
          if (mySeq === asyncSeq.current) {
            setAsyncResults(results);
            setLoading(false);
          }
        })
        .catch(() => {
          if (mySeq === asyncSeq.current) {
            setAsyncResults([]);
            setLoading(false);
          }
        });
    }, 150);
    return () => clearTimeout(timer);
  }, [query, asyncItems, open]);

  // Keyboard-Shortcut
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // focus after mount
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    const local = items.filter((i) => matches(i, query));
    return [...asyncResults, ...local];
  }, [items, asyncResults, query]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const g = item.group ?? 'Allgemein';
      const arr = map.get(g) ?? [];
      arr.push(item);
      map.set(g, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // Flat-Index für Active-Tracking
  const flat = filtered;

  const execute = React.useCallback(
    (item: CommandItem) => {
      setOpen(false);
      if (item.href) {
        window.location.href = item.href;
      } else {
        Promise.resolve(item.action()).catch(() => {
          /* swallow */
        });
      }
    },
    [setOpen],
  );

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flat[active];
      if (item) execute(item);
    }
  };

  if (!open) return <></>;

  let runningIndex = -1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Befehls-Palette"
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]"
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-xl rounded-lg bg-surface border border-border shadow-xl overflow-hidden animate-fade-in">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <svg
            className="h-4 w-4 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            placeholder={placeholder}
            className="flex-1 bg-transparent py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          <Kbd>esc</Kbd>
        </div>
        <ul
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto py-2"
          role="listbox"
        >
          {flat.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-text-muted">
              Keine Treffer.
            </li>
          ) : (
            grouped.map(([group, groupItems]) => (
              <li key={group}>
                <div className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {group}
                </div>
                <ul>
                  {groupItems.map((item) => {
                    runningIndex += 1;
                    const isActive = runningIndex === active;
                    const idx = runningIndex;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => execute(item)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors',
                            isActive
                              ? 'bg-accent/10 text-text-primary'
                              : 'text-text-secondary hover:bg-surface-raised',
                          )}
                          role="option"
                          aria-selected={isActive}
                        >
                          {item.icon ? (
                            <span className="flex h-6 w-6 items-center justify-center text-text-muted">
                              {item.icon}
                            </span>
                          ) : null}
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.hint ? (
                            <span className="text-xs text-text-muted">{item.hint}</span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))
          )}
        </ul>
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-text-muted">
          <div className="flex items-center gap-2">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            <span>navigieren</span>
          </div>
          <div className="flex items-center gap-2">
            <Kbd>↵</Kbd>
            <span>öffnen</span>
          </div>
        </div>
      </div>
    </div>
  );
}
