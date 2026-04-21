import type { Story } from '@ladle/react';
import { useMemo, useState } from 'react';

import { Button } from './button.js';
import { TreatmentTimer } from './treatment-timer.js';

export default {
  title: 'Domain / TreatmentTimer',
};

export const ColorEinwirkzeit: Story = () => {
  const [trigger, setTrigger] = useState(0);
  const endsAt = useMemo(
    () => new Date(Date.now() + 30 * 1000),
    [trigger],
  );
  return (
    <div className="flex flex-col items-start gap-3">
      <TreatmentTimer
        endsAt={endsAt}
        totalDurationMin={0.5}
        label="Farbe einwirken"
      />
      <Button size="sm" variant="secondary" onClick={() => setTrigger((t) => t + 1)}>
        Neu starten (30 s)
      </Button>
    </div>
  );
};
