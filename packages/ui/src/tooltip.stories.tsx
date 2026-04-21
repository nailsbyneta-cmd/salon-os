import type { Story } from '@ladle/react';
import { Button } from './button.js';
import { Tooltip, TooltipProvider } from './tooltip.js';

export default {
  title: 'Overlays / Tooltip',
};

export const IconButtons: Story = () => (
  <TooltipProvider>
    <div className="flex items-center gap-2">
      <Tooltip content="Kalender (⌘K)">
        <Button variant="ghost" aria-label="Kalender">📆</Button>
      </Tooltip>
      <Tooltip content="Kundinnen">
        <Button variant="ghost" aria-label="Kundinnen">👥</Button>
      </Tooltip>
      <Tooltip content="Termin-Historie">
        <Button variant="ghost" aria-label="Historie">🕑</Button>
      </Tooltip>
      <Tooltip content="Ausloggen" side="right">
        <Button variant="ghost" aria-label="Logout">↩</Button>
      </Tooltip>
    </div>
  </TooltipProvider>
);
