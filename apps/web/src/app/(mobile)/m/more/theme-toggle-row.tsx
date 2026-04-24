'use client';
import * as React from 'react';
import { useTheme } from '@salon-os/ui';

/**
 * Theme-Toggle als Listen-Row für /m/more — Mitarbeiter kann
 * persönlich wählen (System/Light/Dark). System respektiert
 * prefers-color-scheme, Rest persistiert in localStorage.
 */
export function ThemeToggleRow(): React.JSX.Element {
  const { theme, resolved, setTheme } = useTheme();
  const opts: Array<{ key: 'system' | 'light' | 'dark'; label: string; emoji: string }> = [
    { key: 'system', label: 'System', emoji: '⚙️' },
    { key: 'light', label: 'Hell', emoji: '☀️' },
    { key: 'dark', label: 'Dunkel', emoji: '🌙' },
  ];

  return (
    <li>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xl">{resolved === 'dark' ? '🌙' : '☀️'}</span>
        <span className="flex-1 text-sm font-medium">Design</span>
        <div className="inline-flex overflow-hidden rounded-md border border-border bg-surface-raised/40">
          {opts.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setTheme(o.key)}
              aria-pressed={theme === o.key}
              className={[
                'px-2.5 py-1 text-xs font-medium transition-all',
                theme === o.key
                  ? 'bg-accent text-accent-foreground'
                  : 'text-text-secondary hover:bg-surface-raised/80',
              ].join(' ')}
              title={o.label}
            >
              {o.emoji}
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}
