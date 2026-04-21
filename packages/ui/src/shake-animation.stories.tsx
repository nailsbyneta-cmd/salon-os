import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Button } from './button.js';
import { Field, Input } from './input.js';
import { ShakeOnError, useShake } from './shake-animation.js';

export default {
  title: 'Micro-Interactions / Shake',
};

export const DeclarativeWrapper: Story = () => {
  const [err, setErr] = useState(false);
  const [trigger, setTrigger] = useState(0);

  return (
    <div style={{ maxWidth: 320, display: 'grid', gap: '0.75rem' }}>
      <ShakeOnError active={err} key={trigger}>
        <Field label="E-Mail" error={err ? 'Bitte gültige Adresse' : undefined}>
          <Input defaultValue="nicht-gueltig" />
        </Field>
      </ShakeOnError>
      <Button
        onClick={() => {
          setErr(true);
          setTrigger((t) => t + 1);
        }}
      >
        Validierung auslösen
      </Button>
    </div>
  );
};

export const HookVariant: Story = () => {
  const { ref, shake } = useShake<HTMLDivElement>();
  return (
    <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 320 }}>
      <div ref={ref} className="rounded-md border border-border p-4 text-sm">
        Dieser Block schüttelt sich, wenn du unten klickst.
      </div>
      <Button onClick={shake}>Schütteln</Button>
    </div>
  );
};
