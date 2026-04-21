import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Field } from './input.js';
import { TimePicker } from './time-picker.js';

export default {
  title: 'Primitives / TimePicker',
};

export const QuarterHourGrid: Story = () => {
  const [value, setValue] = useState('09:00');
  return (
    <div style={{ maxWidth: 320 }}>
      <Field
        label="Termin-Start"
        hint="15-Minuten-Raster; manuelle Eingabe snappt auf."
      >
        <TimePicker
          value={value}
          onValueChange={setValue}
          step={900}
          snapToStep
        />
      </Field>
      <p className="mt-2 text-xs text-text-secondary">Wert: {value}</p>
    </div>
  );
};
