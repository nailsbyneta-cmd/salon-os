import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Combobox } from './combobox.js';
import { Field } from './input.js';

export default {
  title: 'Primitives / Combobox',
};

const services = [
  { value: 'haircut', label: 'Haarschnitt', hint: '30 min' },
  { value: 'color', label: 'Coloration', hint: '90 min' },
  { value: 'keratin', label: 'Keratin-Treatment', hint: '120 min' },
  { value: 'balayage', label: 'Balayage', hint: '150 min' },
  { value: 'highlights', label: 'Strähnchen', hint: '90 min' },
  { value: 'shampoo', label: 'Waschen & Föhnen', hint: '20 min' },
];

export const ServicePicker: Story = () => {
  const [value, setValue] = useState('');
  return (
    <div style={{ maxWidth: 360 }}>
      <Field label="Service">
        <Combobox
          options={services}
          value={value}
          onValueChange={setValue}
          placeholder="Service suchen…"
        />
      </Field>
    </div>
  );
};
