import type { Story } from '@ladle/react';
import { Button } from './button.js';
import { Drawer } from './drawer.js';

export default {
  title: 'Overlays / Drawer',
};

export const Right: Story = () => (
  <Drawer
    side="right"
    title="Neue Kundin anlegen"
    description="Pflichtfelder sind mit * markiert."
    trigger={<Button>Kundin anlegen</Button>}
    footer={
      <>
        <Button variant="ghost">Abbrechen</Button>
        <Button>Speichern</Button>
      </>
    }
  >
    <div className="flex flex-col gap-3 text-sm">
      <label>
        Vorname *
        <input className="block w-full rounded border border-border px-2 py-1" />
      </label>
      <label>
        Nachname *
        <input className="block w-full rounded border border-border px-2 py-1" />
      </label>
      <label>
        Telefon
        <input className="block w-full rounded border border-border px-2 py-1" />
      </label>
    </div>
  </Drawer>
);

export const BottomSheet: Story = () => (
  <Drawer
    side="bottom"
    size="md"
    title="Mehr Optionen"
    trigger={<Button variant="secondary">Mobile Actions</Button>}
  >
    <ul className="flex flex-col gap-2 text-sm">
      <li>Kundin bearbeiten</li>
      <li>Termin-Historie</li>
      <li>DSGVO-Export</li>
      <li className="text-danger">Kundin löschen</li>
    </ul>
  </Drawer>
);
