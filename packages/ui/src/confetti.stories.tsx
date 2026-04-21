import type { Story } from '@ladle/react';

import { Button } from './button.js';
import { burstConfetti } from './confetti.js';

export default {
  title: 'Micro-Interactions / Confetti',
};

export const Presets: Story = () => (
  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
    <Button onClick={() => void burstConfetti('booking-confirmed')}>
      Buchung bestätigt
    </Button>
    <Button
      variant="accent"
      onClick={() => void burstConfetti('big-tip')}
    >
      Big Tip (≥ 20 €)
    </Button>
    <Button variant="secondary" onClick={() => void burstConfetti('milestone')}>
      Milestone erreicht
    </Button>
  </div>
);
