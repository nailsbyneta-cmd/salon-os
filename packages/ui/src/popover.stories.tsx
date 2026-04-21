import type { Story } from '@ladle/react';
import { Button } from './button.js';
import { Popover } from './popover.js';

export default {
  title: 'Overlays / Popover',
};

export const FilterMenu: Story = () => (
  <Popover trigger={<Button variant="secondary">Filter</Button>}>
    <div className="flex flex-col gap-2 text-sm">
      <label className="flex items-center gap-2">
        <input type="checkbox" defaultChecked /> Bestätigte Termine
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" /> Warteliste
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" /> Stornierte
      </label>
    </div>
  </Popover>
);
