'use client';
import * as React from 'react';
import { Field, Input } from '@salon-os/ui';

/**
 * Brand-Color-Picker — kuratierte Salon-Paletten + Custom HEX + Live-Preview.
 * Vorgefertigte Farben treffen 90% der Salon-Zielgruppe (Gold, Rose, Sage,
 * Mauve, Slate, Blush). Custom erlaubt beliebige HEX-Werte.
 */
const PRESETS: Array<{ name: string; hex: string }> = [
  { name: 'Beauty Gold', hex: '#C8A96E' },
  { name: 'Rose', hex: '#D4A5A5' },
  { name: 'Blush', hex: '#E8B4A0' },
  { name: 'Mauve', hex: '#A08B9E' },
  { name: 'Sage', hex: '#9CAF88' },
  { name: 'Slate', hex: '#6B7280' },
  { name: 'Plum', hex: '#8B5A7A' },
  { name: 'Ocean', hex: '#5B8FA8' },
  { name: 'Charcoal', hex: '#3A3A3A' },
  { name: 'Copper', hex: '#B87333' },
  { name: 'Lavender', hex: '#9B8AA6' },
  { name: 'Terracotta', hex: '#C97B5D' },
];

export function BrandColorPicker({ initial }: { initial: string }): React.JSX.Element {
  const [value, setValue] = React.useState(initial || '');
  const normalized = value.startsWith('#') ? value : value ? `#${value}` : '';
  const isValid = /^#[0-9A-Fa-f]{6}$/.test(normalized);

  return (
    <Field
      label="Markenfarbe"
      hint="Überschreibt den Akzent in Admin, Mobile + Online-Booking. HEX oder Preset."
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={isValid ? normalized : '#C8A96E'}
            onChange={(e) => setValue(e.target.value)}
            className="h-11 w-11 shrink-0 cursor-pointer rounded-md border border-border bg-surface"
            aria-label="Farbpicker"
          />
          <Input
            name="brandColor"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="#C8A96E"
            className="flex-1 font-mono text-sm"
            maxLength={20}
          />
          {isValid ? (
            <div
              className="flex h-11 min-w-[90px] items-center justify-center rounded-md px-3 text-xs font-semibold tracking-wider text-white shadow-sm"
              style={{ backgroundColor: normalized }}
              aria-hidden
            >
              VORSCHAU
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
          {PRESETS.map((p) => (
            <button
              key={p.hex}
              type="button"
              onClick={() => setValue(p.hex)}
              title={`${p.name} · ${p.hex}`}
              className={[
                'group relative h-8 w-full rounded-md border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-95',
                value.toLowerCase() === p.hex.toLowerCase()
                  ? 'border-text-primary shadow-md ring-2 ring-accent'
                  : 'border-border',
              ].join(' ')}
              style={{ backgroundColor: p.hex }}
              aria-label={`${p.name} wählen (${p.hex})`}
            />
          ))}
        </div>
        <p className="text-[11px] text-text-muted">
          Tipp: Beauty-Salon-Farben matchen die Atmosphäre — Gold für Premium, Sage für Natural,
          Rose für feminin, Slate für Unisex.
        </p>
      </div>
    </Field>
  );
}
