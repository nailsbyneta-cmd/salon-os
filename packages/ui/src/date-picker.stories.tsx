import type { Story } from '@ladle/react';
import { useState } from 'react';

import { DatePicker } from './date-picker.js';
import { Field } from './input.js';

export default {
  title: 'Primitives / DatePicker',
};

export const Basic: Story = () => {
  const [value, setValue] = useState('');
  return (
    <div style={{ maxWidth: 320 }}>
      <Field label="Termin-Datum">
        <DatePicker value={value} onValueChange={setValue} />
      </Field>
      <p className="mt-2 text-xs text-text-secondary">ISO: {value || '—'}</p>
    </div>
  );
};

export const WeekendDisabled: Story = () => {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div style={{ maxWidth: 320 }}>
      <Field
        label="Arbeitstag"
        hint="Wochenende wird abgewiesen."
      >
        <DatePicker weekendDisabled min={today} />
      </Field>
    </div>
  );
};
