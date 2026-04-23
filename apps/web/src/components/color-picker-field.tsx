'use client';
import * as React from 'react';
import { Input } from '@salon-os/ui';

/**
 * Kombinierter Color-Picker + Text-Input. Der Swatch links öffnet
 * beim Klick den nativen Browser-Color-Picker (`<input type="color">`);
 * der Text-Input rechts erlaubt Copy-Paste von HEX-Strings.
 *
 * Beide Inputs sind controlled gegen denselben State — ändert man den
 * Swatch, updatet sich das Textfeld und umgekehrt.
 *
 * Submit-Value: der `name`-prop gilt fürs sichtbare Text-Input, damit
 * die Server-Action den Wert via FormData normal ausliest.
 */
export function ColorPickerField({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}): React.JSX.Element {
  const [value, setValue] = React.useState(defaultValue ?? '');
  // Nativer color input erwartet 7-Zeichen-HEX (#RRGGBB). Wenn value
  // leer oder kürzer ist, zeigen wir neutralen Grauton damit der Picker
  // trotzdem öffenbar ist.
  const swatchValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#cccccc';
  return (
    <div className="flex items-center gap-2">
      <label
        className="relative h-9 w-9 shrink-0 cursor-pointer rounded-md border border-border transition-shadow hover:shadow-sm"
        style={{ backgroundColor: swatchValue }}
        title="Farbe wählen"
      >
        <input
          type="color"
          value={swatchValue}
          onChange={(e) => setValue(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Farb-Picker öffnen"
        />
      </label>
      <Input
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="#e91e63"
        className="flex-1"
      />
    </div>
  );
}
