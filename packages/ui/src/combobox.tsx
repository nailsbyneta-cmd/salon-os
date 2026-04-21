import * as React from 'react';

import { cn } from './cn.js';
import { Input } from './input.js';

// ─── Combobox ─────────────────────────────────────────────────
//
// Minimaler typeahead-Select ohne Radix-Dep. Kontrolliert/Uncontrolled,
// Keyboard-Navigation (Arrow-Up/Down, Enter, Escape). Keine Async-
// Option-Ladung in v1 — `options` wird extern gefiltert.
//
// Für komplexere Anforderungen (grouped, async, multi) wird später
// cmdk oder Downshift gezogen — jetzt bleibt's leichtgewichtig.

export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  emptyState?: React.ReactNode;
  className?: string;
  /** Optionaler Filter. Default: case-insensitive label contains. */
  filter?: (option: ComboboxOption, query: string) => boolean;
}

const defaultFilter = (opt: ComboboxOption, q: string): boolean =>
  opt.label.toLowerCase().includes(q.toLowerCase());

export function Combobox({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Suchen…',
  emptyState = 'Kein Treffer',
  className,
  filter = defaultFilter,
}: ComboboxProps): React.JSX.Element {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? '');
  const currentValue = value ?? internalValue;
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const filtered = query ? options.filter((o) => filter(o, query)) : options;
  const selectedLabel = options.find((o) => o.value === currentValue)?.label ?? '';

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const commit = (val: string): void => {
    setInternalValue(val);
    onValueChange?.(val);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <Input
        placeholder={placeholder}
        value={open ? query : selectedLabel}
        onChange={(e) => {
          setOpen(true);
          setQuery(e.target.value);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            const pick = filtered[activeIndex];
            if (pick) {
              e.preventDefault();
              commit(pick.value);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open ? (
        <ul
          role="listbox"
          className={cn(
            'absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md',
            'border border-border bg-surface shadow-lg',
          )}
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-secondary">{emptyState}</li>
          ) : null}
          {filtered.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={i === activeIndex}
              className={cn(
                'cursor-pointer px-3 py-2 text-sm',
                i === activeIndex
                  ? 'bg-surface-raised text-text-primary'
                  : 'text-text-secondary hover:bg-surface-raised',
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(opt.value);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {opt.label}
              {opt.hint ? (
                <span className="ml-2 text-xs text-text-muted">{opt.hint}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
